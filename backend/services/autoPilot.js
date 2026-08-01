import cron from 'node-cron'
import { OwnerSettings } from '../models/OwnerSettings.js'
import { Integration } from '../models/Integration.js'
import ScheduledPost from '../models/ScheduledPost.js'
import { alertOwner } from './ownerBot.js'
import { google } from 'googleapis'
import { emergencyStop } from '../routes/admin.js'

let autopilotJob = null

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const youtube = YOUTUBE_API_KEY ? google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY }) : null

export async function isEnabled(ownerId) {
  const settings = await OwnerSettings.findOne({ ownerId }).lean()
  return settings?.features?.autopilot === true
}

export async function isAutopilotEnabled(ownerId) {
  return isEnabled(ownerId)
}

async function getConnectedPlatforms(ownerId) {
  const integrations = await Integration.find({ ownerId, connected: true }).lean()
  return integrations.map(i => i.provider)
}

async function publishToYouTube(post, ownerId) {
  if (!youtube || !post.mediaUrl) return { success: false, error: 'YouTube API not configured' }
  try {
    // Real upload requires OAuth2 auth; this is a placeholder
    return { success: false, error: 'YouTube upload requires OAuth2 credentials' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToInstagram(post, ownerId) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) return { success: false, error: 'Instagram token not configured' }
  try {
    return { success: false, error: 'Instagram Basic Display does not support direct publishing' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToTikTok(post, ownerId) {
  if (!process.env.TIKTOK_ACCESS_TOKEN) return { success: false, error: 'TikTok token not configured' }
  try {
    return { success: false, error: 'TikTok upload API not configured' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToTelegram(post, ownerId) {
  if (!global.ownerBot || typeof global.ownerBot.sendMessage !== 'function') {
    return { success: false, error: 'Telegram bot not configured' }
  }
  try {
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID
    if (!chatId) return { success: false, error: 'No Telegram target chat' }
    await global.ownerBot.sendMessage(chatId, `🚀 ${post.title}\n\n${post.content || ''}`)
    return { success: true, url: `https://t.me/c/${chatId}` }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToTwitter(post, ownerId) {
  return { success: false, error: 'Twitter/X integration not configured' }
}

async function publishToPlatform(post, platform, ownerId) {
  switch (platform) {
    case 'youtube': return publishToYouTube(post, ownerId)
    case 'instagram': return publishToInstagram(post, ownerId)
    case 'tiktok': return publishToTikTok(post, ownerId)
    case 'telegram': return publishToTelegram(post, ownerId)
    case 'twitter': return publishToTwitter(post, ownerId)
    default: return { success: false, error: `Platform ${platform} not supported` }
  }
}

async function publishPost(post, ownerId) {
  const connectedPlatforms = await getConnectedPlatforms(ownerId)
  if (connectedPlatforms.length === 0) {
    console.log(`[AutoPilot] нет подключенных платформ для owner ${ownerId}`)
    post.status = 'failed'
    post.errorMessage = 'AutoPilot: нет подключенных платформ'
    post.updatedAt = new Date()
    await post.save()
    return { post, results: {}, anySuccess: false }
  }

  const platformsToPublish = post.platforms?.filter(p => connectedPlatforms.includes(p)) || connectedPlatforms
  const results = {}
  let anySuccess = false

  for (const platform of platformsToPublish) {
    const result = await publishToPlatform(post, platform, ownerId)
    results[platform] = result
    if (result.success) anySuccess = true
  }

  const status = anySuccess ? 'published' : 'failed'
  post.status = status
  post.errorMessage = Object.entries(results)
    .filter(([, r]) => !r.success)
    .map(([p, r]) => `${p}: ${r.error}`)
    .join('; ')
  post.publishedUrl = anySuccess ? 'https://ai-viral.studio/published/' + post._id : ''
  post.updatedAt = new Date()
  await post.save()

  await alertOwner(`🤖 AutoPilot публикация\n📝 ${post.title}\n📺 Площадки: ${platformsToPublish.join(', ') || '—'}\n📊 Статус: ${status}\n⏰ ${new Date().toLocaleString('ru-RU')}`).catch(() => {})

  return { post, results, anySuccess }
}

async function runAutopilotTick() {
  if (emergencyStop) {
    console.log('[AutoPilot] emergency stop active, skipping tick')
    return
  }
  const now = new Date()
  try {
    const enabledSettings = await OwnerSettings.find({ 'features.autopilot': true }).lean()
    if (enabledSettings.length === 0) {
      console.log('[AutoPilot] выключен у всех owner, пропускаю тик')
      return
    }

    for (const settings of enabledSettings) {
      const ownerId = settings.ownerId
      const connectedPlatforms = await getConnectedPlatforms(ownerId)
      if (connectedPlatforms.length === 0) {
        console.log(`[AutoPilot] нет подключенных платформ для owner ${ownerId}`)
        continue
      }

      const posts = await ScheduledPost.find({
        userId: ownerId,
        status: 'scheduled',
        scheduledAt: { $lte: now },
      }).sort({ scheduledAt: 1 })

      for (const post of posts) {
        await publishPost(post, ownerId)
      }
    }
  } catch (err) {
    console.error('[autoPilot] tick failed:', err.message)
  }
}

export function startAutopilot() {
  if (autopilotJob) return
  autopilotJob = cron.schedule('*/30 * * * *', runAutopilotTick)
  console.log('[autoPilot] cron started (every 30 min)')
}

export function stopAutopilot() {
  if (autopilotJob) {
    autopilotJob.stop()
    autopilotJob = null
  }
}

export async function setAutopilotEnabled(ownerId, enabled) {
  await OwnerSettings.findOneAndUpdate(
    { ownerId },
    { $set: { 'features.autopilot': !!enabled } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  if (enabled && !autopilotJob) startAutopilot()
  return !!enabled
}

export async function scheduleAutoPost(ownerId, data) {
  const post = await ScheduledPost.create({
    ...data,
    userId: ownerId,
    status: 'scheduled',
  })
  return post
}

export default { startAutopilot, stopAutopilot, setAutopilotEnabled, isEnabled, isAutopilotEnabled, scheduleAutoPost }
