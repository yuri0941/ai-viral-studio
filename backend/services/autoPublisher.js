import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'
import { publishToPlatform } from './platformPublisher.js'
import { getConnectedSocials, formatPlatformReasons } from '../utils/connectedSocials.js'

// [v9.9.19.3] алерт владельцу о постах без платформ — один раз на пост, без спама
const noPlatformAlerted = new Set()

// [v9.9.19.16] retry only for transient failures; permission/setup errors are permanent
const PERMANENT_ERROR_CODES = [
  'vk_not_connected',
  'vk_needs_wall_scope',
  'vk_permission_denied',
  'vk_invalid_token',
  'vk_wall_denied',
  'vk_access_denied',
  'vk_group_disabled',
  'vk_invalid_group',
  'vk_auth_failed',
  'vk_invalid_request',
  'refresh_failed',
  'empty_text',
  'no_post_id',
  'no_group',
  'invalid_group',
  'not connected',
  'telegram bot token',
  'chat id не настроены',
  'not_connected',
  'needs_scope',
  'no_chat',
  'no_token',
  'scope_denied'
]

// [v9.9.19.16.1] log each permanent skip only once per process
const permanentSkipLogged = new Set()

function isPermanentError(result) {
  if (result?.permanent === true || result?.result?.permanent === true) return true
  const text = String(result?.error || result?.result?.error || result?.result?.hint || result?.errorMessage || '').toLowerCase()
  return PERMANENT_ERROR_CODES.some(code => text.includes(code.toLowerCase()))
}

export const startAutoPublisher = () => {
    setInterval(async () => {
        const now = new Date()
        const posts = await ScheduledPost.find({
            $or: [
                { status: 'scheduled', scheduledAt: { $lte: now } },
                { status: 'failed', retriedAt: { $exists: false }, scheduledAt: { $lte: new Date(now.getTime() + 5 * 60 * 1000) } }
            ]
        })

        for (const post of posts) {
            let platforms = post.platforms || []

            // [v9.9.19.2-UX-HOTFIX-v4] platforms пуст → пропуск с понятным логом.
            if (platforms.length === 0) {
                if (!noPlatformAlerted.has(String(post._id))) {
                    noPlatformAlerted.add(String(post._id))
                    console.warn(`[AUTO-PUBLISH] skipped: no platforms connected (post ${post._id})`)
                }
                continue
            }

            const user = await User.findById(post.userId)
                .select('+vkToken +vkRefreshToken +vkUserId +vkCommunityKey vkGroupId vkConnected telegramBotToken telegramChatId telegramId preferences.language')
            if (!user) {
                console.warn(`[AUTO-PUBLISH] skipped: user not found (post ${post._id})`)
                post.status = 'failed'
                post.errorMessage = 'User not found'
                await post.save()
                continue
            }

            // [v9.9.19.15.2] единый источник правды о подключённых соцсетях
            const socialStatus = await getConnectedSocials(user)
            console.log(`[AUTO-PUBLISH] post=${post._id} user=${post.userId} vk=${JSON.stringify(socialStatus.vk)} telegram=${JSON.stringify(socialStatus.telegram)}`)

            const results = []

            for (const platform of platforms) {
                // Проверяем подключение ДО вызова публикатора
                const status = socialStatus[platform]
                if (status && !status.connected) {
                    results.push({
                        platform,
                        status: 'error',
                        error: status.reason,
                        result: { success: false, error: `${platform}_not_connected`, reason: status.reason, hint: formatPlatformReasons({ [platform]: status }, socialStatus.language) }
                    })
                    continue
                }

                try {
                    const result = await publishToPlatform(user, platform, post)
                    results.push({ platform, status: result.success !== false ? 'published' : 'error', result })
                } catch (e) {
                    results.push({ platform, status: 'error', error: e.message })
                }
            }

            const publishedCount = results.filter(r => r.status === 'published').length
            const allErrorsPermanent = publishedCount === 0 && results.length > 0 && results.every(r => r.status === 'error' && isPermanentError(r))

            // [v9.9.19.15.1] retry once after 5 minutes only for transient failures
            if (publishedCount === 0 && !post.retriedAt && !allErrorsPermanent) {
                post.status = 'scheduled'
                post.scheduledAt = new Date(Date.now() + 5 * 60 * 1000)
                post.retriedAt = new Date()
                post.publishResults = results
                post.errorMessage = results.map(r => `${r.platform}: ${r.error || r.result?.error || 'failed'}`).join('; ')
                await post.save()
                console.warn(`[AUTO-PUBLISH] retry scheduled in 5 min (post ${post._id}): ${post.errorMessage}`)
                continue
            }

            post.status = publishedCount > 0 ? 'published' : 'failed'
            post.publishResults = results
            post.publishedAt = new Date()
            if (publishedCount === 0) {
                post.errorMessage = results.map(r => `${r.platform}: ${r.error || r.result?.error || 'failed'}`).join('; ')
                // [v9.9.19.16.1] prevent permanent-failed posts from being re-selected every 5 minutes
                post.retriedAt = new Date()
                const skipKey = `${post._id}:${post.errorMessage}`
                if (!permanentSkipLogged.has(skipKey)) {
                    permanentSkipLogged.add(skipKey)
                    console.warn(`[AUTO-PUBLISH] skipped: post ${post._id} — 0 platforms published (${results.map(r => `${r.platform}:${r.status}`).join(', ')})`)
                }
                if (!noPlatformAlerted.has(String(post._id))) {
                    noPlatformAlerted.add(String(post._id))
                    try {
                        const { alertOwner } = await import('./ownerBot.js')
                        const reasons = formatPlatformReasons(socialStatus, socialStatus.language)
                        const action = socialStatus.language === 'ru'
                            ? `Проверьте статус в Соцсетях.`
                            : `Check status in Socials.`
                        alertOwner?.(`⚠️ ${socialStatus.language === 'ru' ? 'Автопост не опубликован' : 'Auto-post not published'}: ${(post.title || '').slice(0, 60)}\n${reasons}\n${action}`)
                    } catch { /* алерт не критичен */ }
                }
            } else {
                const firstUrl = results.find(r => r.result?.postUrl)?.result?.postUrl
                if (firstUrl) post.publishedUrl = firstUrl
                console.log(`[AUTO-PUBLISH] Post ${post._id} published to ${publishedCount} platforms`)
            }
            await post.save()
        }
    }, 5 * 60 * 1000)

    console.log('[AUTO-PUBLISH] Started (checking every 5 minutes)')
}

// [SOCIAL-v5.1] added
