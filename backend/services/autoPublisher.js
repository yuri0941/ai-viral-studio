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

            // [v9.9.19.3] если платформы не выбраны — цель по умолчанию: Telegram-канал владельца
            if (platforms.length === 0) {
                try {
                    const { publishToChannel } = await import('./telegramChannelManager.js')
                    const text = [post.title, post.content].filter(Boolean).join('\n\n')
                    const pub = await publishToChannel({ text: text || 'Пост без текста' })
                    if (pub?.success) {
                        post.status = 'published'
                        post.publishResults = [{ platform: 'telegram_channel', status: 'published', messageId: pub.messageId, url: pub.url }]
                        post.publishedAt = new Date()
                        await post.save()
                        console.log(`[AUTO-PUBLISH] to=channel result=ok id=${pub.messageId}`)
                    } else {
                        post.status = 'failed'
                        post.publishResults = [{ platform: 'telegram_channel', status: 'error', error: pub?.error }]
                        await post.save()
                        console.warn(`[AUTO-PUBLISH] to=channel result=fail: ${pub?.error}`)
                    }
                } catch (e) {
                    post.status = 'failed'
                    post.publishResults = [{ platform: 'telegram_channel', status: 'error', error: e.message }]
                    await post.save()
                    console.warn(`[AUTO-PUBLISH] to=channel result=fail: ${e.message}`)
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
