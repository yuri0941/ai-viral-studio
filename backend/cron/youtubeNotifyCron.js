import cron from 'node-cron'
import YouTubeToken from '../models/YouTubeToken.js'
import ScheduledPost from '../models/ScheduledPost.js'
import { checkTokenAlive, notifyClientYoutubeReminder } from '../services/youtubeService.js'
import { alertOwner } from '../services/ownerBot.js'

// [19.17.8-NOTIFY-RESILIENCE] daily token health check at 06:00 MSK
// Runs at 03:00 UTC (06:00 MSK in winter, 06:00 MSK summer via MSK offset)
export function startYoutubeTokenHealthCron() {
    cron.schedule('0 3 * * *', async () => {
        try {
            const tokens = await YouTubeToken.find({ status: { $ne: 'revoked' } }).lean()
            for (const token of tokens) {
                const result = await checkTokenAlive(token.userId)
                if (!result.alive) {
                    console.warn(`[yt:health] user ${token.userId} token is ${result.status}: ${result.reason}`)
                    alertOwner?.(`⚠️ YouTube token dead\nClient: ${token.userId}\nStatus: ${result.status}\nReason: ${result.reason}`).catch(() => {})
                }
            }
        } catch (err) {
            console.error('[yt:health] cron failed:', err.message)
        }
    })
    console.log('[yt:health] daily token check scheduled (06:00 MSK)')
}

// [19.17.8-NOTIFY-RESILIENCE] remind client 1 hour before scheduled YouTube publish if token is dead
export function startYoutubeReminderCron() {
    cron.schedule('*/10 * * * *', async () => {
        try {
            const now = new Date()
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
            const posts = await ScheduledPost.find({
                platforms: 'youtube',
                status: 'scheduled',
                scheduledAt: { $gt: now, $lte: oneHourFromNow },
                youtubeVideoId: { $in: ['', null] },
            }).lean()

            for (const post of posts) {
                const token = await YouTubeToken.findOne({ userId: post.userId }).lean()
                if (!token || token.status !== 'active') {
                    await notifyClientYoutubeReminder(post.userId, post.youtubeTitle || post.title, post.scheduledAt).catch(() => {})
                }
            }
        } catch (err) {
            console.error('[yt:reminder] cron failed:', err.message)
        }
    })
    console.log('[yt:reminder] scheduled-post reminder cron started (every 10 min)')
}
