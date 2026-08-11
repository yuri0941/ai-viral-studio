import ScheduledPost from '../models/ScheduledPost.js'
import Integration from '../models/Integration.js'
import { publish } from './publishers/index.js'

// [v9.9.19.3] алерт владельцу о постах без платформ — один раз на пост, без спама
const noPlatformAlerted = new Set()

export const startAutoPublisher = () => {
    setInterval(async () => {
        const now = new Date()
        const posts = await ScheduledPost.find({ status: 'scheduled', scheduledAt: { $lte: now } })

        for (const post of posts) {
            let platforms = post.platforms || []

            // [v9.9.19.2-UX-HOTFIX-v4] platforms пуст → пропуск с понятным логом (НЕ «published to 0 platforms» как успех).
            // Telegram-канал владельца ведёт отдельный автопостер канала (telegramChannelManager, cron 08/14/20 MSK).
            if (platforms.length === 0) {
                if (!noPlatformAlerted.has(String(post._id))) {
                    noPlatformAlerted.add(String(post._id))
                    console.warn(`[AUTO-PUBLISH] skipped: no platforms connected (post ${post._id})`)
                }
                continue
            }

            const results = []

            for (const platform of platforms) {
                const integration = await Integration.findOne({ userId: post.userId, provider: platform, isActive: true })
                if (!integration) {
                    results.push({ platform, status: 'skipped', reason: 'Not connected' })
                    continue
                }

                try {
                    const result = await publish(platform, integration, post)
                    results.push({ platform, status: 'published', result })
                } catch (e) {
                    results.push({ platform, status: 'error', error: e.message })
                }
            }

            const publishedCount = results.filter(r => r.status === 'published').length
            post.status = publishedCount > 0 ? 'published' : 'failed'
            post.publishResults = results
            post.publishedAt = new Date()
            await post.save()

            // [v9.9.19.3] 0 платформ = warning + ОДИН алерт владельцу (не спам)
            if (publishedCount === 0) {
                console.warn(`[AUTO-PUBLISH] skipped: post ${post._id} — 0 platforms published (${results.map(r => `${r.platform}:${r.status}`).join(', ')})`)
                if (!noPlatformAlerted.has(String(post._id))) {
                    noPlatformAlerted.add(String(post._id))
                    try {
                        const { alertOwner } = await import('./ownerBot.js')
                        alertOwner?.(`⚠️ Автопост не опубликован: ни одна платформа не подключена.\nПост: ${(post.title || '').slice(0, 60)}\nПодключите соцсети в Integrations или оставьте platforms пустым — уйдёт в Telegram-канал.`)
                    } catch { /* алерт не критичен */ }
                }
            } else {
                console.log(`[AUTO-PUBLISH] Post ${post._id} published to ${publishedCount} platforms`)
            }
        }
    }, 5 * 60 * 1000)

    console.log('[AUTO-PUBLISH] Started (checking every 5 minutes)')
}

// [SOCIAL-v5.1] added
