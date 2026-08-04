import cron from 'node-cron'
import { Subscription } from '../models/index.js'
import User from '../models/User.js'
import { sendTrialEndingEmail, sendSubscriptionExpiredEmail } from './emailService.js'

// [MASTER-v5.0] added: daily subscription lifecycle cron
export function startSubscriptionCron() {
    cron.schedule('0 0 * * *', async () => {
        console.log('[subscriptionCron] running daily check')
        const now = new Date()
        const inThreeDays = new Date(now)
        inThreeDays.setDate(inThreeDays.getDate() + 3)

        try {
            // Expire subscriptions where endDate passed and still active/trialing
            const expired = await Subscription.find({
                status: { $in: ['active', 'trialing'] },
                endDate: { $lt: now },
            }).lean()

            for (const sub of expired) {
                await Subscription.findByIdAndUpdate(sub._id, { $set: { status: 'expired', autoRenew: false } })
                await User.findByIdAndUpdate(sub.userId, { $set: { subscription: 'free' } })
                const user = await User.findById(sub.userId)
                if (user?.email) {
                    try {
                        await sendSubscriptionExpiredEmail(user.email, user.name)
                    } catch (e) {
                        console.warn('[subscriptionCron] expired email failed:', e.message)
                    }
                }
            }

            // Trial ending in 3 days
            const trialEnding = await Subscription.find({
                status: 'trialing',
                trialEndsAt: { $gte: inThreeDays, $lt: new Date(inThreeDays.getTime() + 24 * 60 * 60 * 1000) },
            }).lean()

            for (const sub of trialEnding) {
                const user = await User.findById(sub.userId)
                if (user?.email) {
                    try {
                        await sendTrialEndingEmail(user.email, user.name, 3)
                    } catch (e) {
                        console.warn('[subscriptionCron] trial ending email failed:', e.message)
                    }
                }
            }

            console.log(`[subscriptionCron] expired: ${expired.length}, trialEnding: ${trialEnding.length}`)
        } catch (err) {
            console.error('[subscriptionCron] error:', err.message)
        }
    })
}
