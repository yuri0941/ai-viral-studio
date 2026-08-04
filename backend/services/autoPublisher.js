import ScheduledPost from '../models/ScheduledPost.js'
import Integration from '../models/Integration.js'
import { publish } from './publishers/index.js'

export const startAutoPublisher = () => {
    setInterval(async () => {
        const now = new Date()
        const posts = await ScheduledPost.find({ status: 'scheduled', scheduledAt: { $lte: now } })

        for (const post of posts) {
            const platforms = post.platforms || []
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

            post.status = results.some(r => r.status === 'published') ? 'published' : 'failed'
            post.publishResults = results
            post.publishedAt = new Date()
            await post.save()

            console.log(`[AUTO-PUBLISH] Post ${post._id} published to ${results.filter(r => r.status === 'published').length} platforms`)
        }
    }, 5 * 60 * 1000)

    console.log('[AUTO-PUBLISH] Started (checking every 5 minutes)')
}

// [SOCIAL-v5.1] added
