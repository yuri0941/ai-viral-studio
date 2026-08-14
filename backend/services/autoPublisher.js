import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'
import { publishToPlatform } from './platformPublisher.js'
import { getConnectedSocials, formatPlatformReasons } from '../utils/connectedSocials.js'
import { runSchedulerCleanup, runMediaCleanup } from '../cron/schedulerCleanup.js'

let lastMediaCleanupDate = ''

// [v9.9.19.3] алерт владельцу о постах без платформ — один раз на пост, без спама
const noPlatformAlerted = new Set()

// [v9.9.19.16] retry only for transient failures; permission/setup errors are permanent
const PERMANENT_ERROR_CODES = [
  'vk_not_connected',
  'vk_needs_wall_scope',
  'vk_permission_denied',
  'vk_invalid_token',
  'vk_video_no_scope',
  'vk_disabled',
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
  'empty_post',
  'empty_text',
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

// [FIX-BUFFER] максимум 3 неудачи подряд; при исчерпании — ОДНО уведомление владельцу
const MAX_PUBLISH_FAILURES = 3

async function maybeAlertRetriesExhausted(postId) {
  try {
    const post = await ScheduledPost.findById(postId).lean()
    if (!post || (post.failCount || 0) < MAX_PUBLISH_FAILURES || post.failAlertedAt) return
    await ScheduledPost.updateOne({ _id: postId }, { $set: { failAlertedAt: new Date() } })
    const { alertOwner } = await import('./ownerBot.js')
    alertOwner?.(
      `🛑 Автопост остановлен после ${MAX_PUBLISH_FAILURES} неудач\nПост: ${(post.title || post._id).toString().slice(0, 80)}\nПричина: ${String(post.errorMessage || 'неизвестно').slice(0, 200)}\nПовторите вручную из Планировщика (кнопка «Повторить»).`
    ).catch(() => {})
  } catch (e) {
    console.warn('[AUTO-PUBLISH] fail alert error:', e.message)
  }
}

export const startAutoPublisher = () => {
    setInterval(async () => {
        // [v9.9.19.15.16] recover posts stuck in publishing for >10 minutes
        try {
            const stalePublishing = await ScheduledPost.find({
                status: 'publishing',
                publishStartedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
            })
            for (const stale of stalePublishing) {
                // [FIX-BUFFER] stale-ретрай засчитывается в потолок (3 подряд → стоп), иначе мёртвые посты крутились бесконечно
                await ScheduledPost.updateOne(
                    { _id: stale._id },
                    { $set: { status: 'failed', errorMessage: 'stale_publishing' }, $inc: { failCount: 1 } }
                )
                console.warn(`[AUTO-PUBLISH] stale publishing post ${stale._id} marked failed`)
                await maybeAlertRetriesExhausted(stale._id)
            }
        } catch (e) {
            console.warn('[AUTO-PUBLISH] stale publishing watchdog error:', e.message)
        }

        // [19.17.7-SCHEDULER-UX] TTL cleanup hooks
        try {
            await runSchedulerCleanup()
        } catch (e) {
            console.warn('[AUTO-PUBLISH] scheduler cleanup error:', e.message)
        }
        const today = new Date().toISOString().slice(0, 10)
        if (today !== lastMediaCleanupDate) {
            lastMediaCleanupDate = today
            try {
                const { deleted, freed } = await runMediaCleanup()
                if (deleted) console.log(`[AUTO-PUBLISH] media cleanup: ${deleted} files freed ${Math.round(freed / 1024 / 1024)} MB`)
            } catch (e) {
                console.warn('[AUTO-PUBLISH] media cleanup error:', e.message)
            }
        }
        const now = new Date()
        const candidatePosts = await ScheduledPost.find({
            $or: [
                { status: 'scheduled', scheduledAt: { $lte: now }, hidden: { $ne: true } },
                // [FIX-BUFFER] failed переотбираются, только если не исчерпан потолок (3 подряд)
                { status: 'failed', $or: [{ failCount: { $exists: false } }, { failCount: { $lt: MAX_PUBLISH_FAILURES } }], scheduledAt: { $lte: new Date(now.getTime() + 5 * 60 * 1000) }, hidden: { $ne: true } }
            ]
        })

        for (const post of candidatePosts) {
            // [v9.9.19.15.10] atomic capture to avoid racing with manual /publish
            const captured = await ScheduledPost.findOneAndUpdate(
                { _id: post._id, status: { $in: ['scheduled', 'failed'] }, hidden: { $ne: true } },
                { $set: { status: 'publishing', publishStartedAt: new Date() } },
                { new: true }
            )
            if (!captured) {
                console.warn(`[AUTO-PUBLISH] post ${post._id} already being processed, skipping`)
                continue
            }

            let platforms = captured.platforms || []

            // [v9.9.19.2-UX-HOTFIX-v4] platforms пуст → пропуск с понятным логом.
            if (platforms.length === 0) {
                if (!noPlatformAlerted.has(String(captured._id))) {
                    noPlatformAlerted.add(String(captured._id))
                    console.warn(`[AUTO-PUBLISH] skipped: no platforms connected (post ${captured._id})`)
                }
                await ScheduledPost.updateOne(
                    { _id: captured._id },
                    { $set: { status: 'failed', errorMessage: 'No platforms selected' } }
                )
                continue
            }

            const user = await User.findById(captured.userId)
                .select('+vkToken +vkRefreshToken +vkUserId +vkCommunityKey vkGroupId vkConnected telegramBotToken telegramChatId telegramId preferences.language')
            if (!user) {
                console.warn(`[AUTO-PUBLISH] skipped: user not found (post ${captured._id})`)
                await ScheduledPost.updateOne(
                    { _id: captured._id },
                    { $set: { status: 'failed', errorMessage: 'User not found' } }
                )
                continue
            }

            // [v9.9.19.15.2] единый источник правды о подключённых соцсетях
            const socialStatus = await getConnectedSocials(user)
            console.log(`[AUTO-PUBLISH] post=${captured._id} user=${captured.userId} vk=${JSON.stringify(socialStatus.vk)} telegram=${JSON.stringify(socialStatus.telegram)}`)

            const results = []

            for (const platform of platforms) {
                // [v9.9.19.15.17] globally disabled platform — silent skip, no API calls, no alerts
                const status = socialStatus[platform]
                if (status?.disabled) {
                    results.push({
                        platform,
                        status: 'skipped',
                        result: { success: false, skipped: true, error: 'vk_disabled', reason: status.reason }
                    })
                    continue
                }

                // Проверяем подключение ДО вызова публикатора
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
                    const result = await publishToPlatform(user, platform, captured)
                    results.push({ platform, status: result.success !== false ? 'published' : 'error', result })
                } catch (e) {
                    results.push({ platform, status: 'error', error: e.message })
                }
            }

            const publishedCount = results.filter(r => r.status === 'published').length
            const skippedCount = results.filter(r => r.status === 'skipped').length
            const allSkipped = skippedCount === results.length && results.length > 0
            const allErrorsPermanent = publishedCount === 0 && results.length > 0 && results.every(r => r.status === 'error' && isPermanentError(r))
            const errorMessage = results.map(r => `${r.platform}: ${r.error || r.result?.error || r.result?.reason || 'failed'}`).join('; ')

            // [v9.9.19.15.17] all platforms globally disabled — mark skipped, no retries, no alerts
            if (allSkipped) {
                await ScheduledPost.updateOne(
                    { _id: captured._id },
                    { $set: { status: 'skipped', errorMessage: 'vk_disabled', publishResults: results, publishedAt: new Date() } }
                )
                continue
            }

            // [v9.9.19.15.1] retry once after 5 minutes only for transient failures
            // [FIX-BUFFER] ретраев максимум MAX_PUBLISH_FAILURES-1; дальше — failed + одно уведомление
            if (publishedCount === 0 && (captured.failCount || 0) < MAX_PUBLISH_FAILURES - 1 && !allErrorsPermanent) {
                await ScheduledPost.updateOne(
                    { _id: captured._id },
                    { $set: { status: 'scheduled', scheduledAt: new Date(Date.now() + 5 * 60 * 1000), retriedAt: new Date(), publishResults: results, errorMessage }, $inc: { failCount: 1 } }
                )
                console.warn(`[AUTO-PUBLISH] retry scheduled in 5 min (post ${captured._id}, fail ${(captured.failCount || 0) + 1}/${MAX_PUBLISH_FAILURES}): ${errorMessage}`)
                continue
            }

            const finalStatus = publishedCount > 0 ? 'published' : 'failed'
            const publishedUrl = results.find(r => r.result?.postUrl)?.result?.postUrl || ''
            const update = {
                status: finalStatus,
                publishResults: results,
                publishedAt: new Date(),
                publishedUrl,
                errorMessage: finalStatus === 'failed' ? errorMessage : ''
            }
            if (finalStatus === 'failed') {
                // [v9.9.19.16.1] prevent permanent-failed posts from being re-selected every 5 minutes
                update.retriedAt = new Date()
                // [19.17.7-SCHEDULER-UX] keep file for 24h retry, then cleanup moves to 'error'
                update.fileExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
                const skipKey = `${captured._id}:${errorMessage}`
                if (!permanentSkipLogged.has(skipKey)) {
                    permanentSkipLogged.add(skipKey)
                    console.warn(`[AUTO-PUBLISH] skipped: post ${captured._id} — 0 platforms published (${results.map(r => `${r.platform}:${r.status}`).join(', ')})`)
                }
                if (!noPlatformAlerted.has(String(captured._id))) {
                    noPlatformAlerted.add(String(captured._id))
                    try {
                        const { alertOwner } = await import('./ownerBot.js')
                        const reasons = formatPlatformReasons(socialStatus, socialStatus.language)
                        const action = socialStatus.language === 'ru'
                            ? `Проверьте статус в Соцсетях.`
                            : `Check status in Socials.`
                        alertOwner?.(`⚠️ ${socialStatus.language === 'ru' ? 'Автопост не опубликован' : 'Auto-post not published'}: ${(captured.title || '').slice(0, 60)}\n${reasons}\n${action}`)
                    } catch { /* алерт не критичен */ }
                }
            } else {
                console.log(`[AUTO-PUBLISH] Post ${captured._id} published to ${publishedCount} platforms`)
            }
            // [FIX-BUFFER] финальный fail засчитывается в потолок; уведомление — один раз на пост
            if (finalStatus === 'failed') {
                await ScheduledPost.updateOne({ _id: captured._id }, { $set: update, $inc: { failCount: 1 } })
                await maybeAlertRetriesExhausted(captured._id)
            } else {
                await ScheduledPost.updateOne({ _id: captured._id }, { $set: update })
            }

            // [19.17.7-SCHEDULER-UX] after DB update, delete uploaded files immediately on success;
            // set autoDeleteAt for the post record based on user's preference.
            if (finalStatus === 'published') {
                try {
                    // [P1.5-METRICS] first_post — один раз на пользователя, метрика не валит публикацию
                    const { trackFirstPost } = await import('./metricsService.js')
                    await trackFirstPost(captured.userId)
                } catch (mErr) {
                    console.warn('[metrics] first_post track failed:', mErr.message)
                }
                try {
                    const { deletePostFiles } = await import('../cron/schedulerCleanup.js')
                    await deletePostFiles(captured)
                    const ttl = user?.preferences?.autoCleanTTL
                    let autoDeleteAt = null
                    if (ttl === -1) {
                        autoDeleteAt = null
                    } else {
                        const minutes = Number.isFinite(ttl) ? ttl : 15
                        if (minutes <= 0) autoDeleteAt = new Date()
                        else autoDeleteAt = new Date(Date.now() + minutes * 60 * 1000)
                    }
                    await ScheduledPost.updateOne(
                        { _id: captured._id },
                        { $set: { autoDeleteAt } }
                    )
                } catch (e) {
                    console.warn('[AUTO-PUBLISH] post-cleanup failed:', e.message)
                }
            }
        }
    }, 5 * 60 * 1000)

    console.log('[AUTO-PUBLISH] Started (checking every 5 minutes)')
}

// [SOCIAL-v5.1] added
