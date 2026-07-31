import cron from 'node-cron'
import ScheduledPost from '../models/ScheduledPost.js'
import { alertOwner } from './ownerBot.js'
import { google } from 'googleapis'
import axios from 'axios'

let autopilotEnabled = false
let autopilotJob = null

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const youtube = YOUTUBE_API_KEY ? google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY }) : null

async function publishToYouTube(post) {
  if (!youtube || !post.mediaUrl) return { success: false, error: 'YouTube API not configured' }
  try {
    // Real upload requires OAuth2 auth; this is a placeholder
    return { success: false, error: 'YouTube upload requires OAuth2 credentials' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToInstagram(post) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) return { success: false, error: 'Instagram token not configured' }
  try {
    return { success: false, error: 'Instagram Basic Display does not support direct publishing' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToTikTok(post) {
  if (!process.env.TIKTOK_ACCESS_TOKEN) return { success: false, error: 'TikTok token not configured' }
  try {
    return { success: false, error: 'TikTok upload API not configured' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function publishToPlatform(post, platform) {
  switch (platform) {
    case 'youtube': return publishToYouTube(post)
    case 'instagram': return publishToInstagram(post)
    case 'tiktok': return publishToTikTok(post)
    default: return { success: false, error: `Platform ${platform} not supported` }
  }
}

async function publishPost(post) {
  const results = {}
  let anySuccess = false

  for (const platform of post.platforms || []) {
    const result = await publishToPlatform(post, platform)
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

  await alertOwner(`🤖 AutoPilot публикация\n📝 ${post.title}\n📺 Площадки: ${post.platforms?.join(', ') || '—'}\n📊 Статус: ${status}\n⏰ ${new Date().toLocaleString('ru-RU')}`).catch(() => {})

  return { post, results, anySuccess }
}

async function runAutopilotTick() {
  if (!autopilotEnabled) return

  const now = new Date()
  try {
    const posts = await ScheduledPost.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
      autoPilotEnabled: true,
    }).sort({ scheduledAt: 1 })

    for (const post of posts) {
      await publishPost(post)
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

export function setAutopilotEnabled(enabled) {
  autopilotEnabled = !!enabled
  if (enabled && !autopilotJob) startAutopilot()
  if (!enabled && autopilotJob) stopAutopilot()
  return autopilotEnabled
}

export function isAutopilotEnabled() {
  return autopilotEnabled
}

export async function scheduleAutoPost(data) {
  const post = await ScheduledPost.create({
    ...data,
    status: 'scheduled',
    autoPilotEnabled: true,
  })
  return post
}

export default { startAutopilot, stopAutopilot, setAutopilotEnabled, isAutopilotEnabled, scheduleAutoPost }
