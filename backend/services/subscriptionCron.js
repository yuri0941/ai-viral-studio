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

            // Active subscriptions ending in 3 days
            const activeEndingSoon = await Subscription.find({
                status: { $in: ['active', 'trialing'] },
                endDate: { $gte: inThreeDays, $lt: new Date(inThreeDays.getTime() + 24 * 60 * 60 * 1000) },
                reminderSent: { $ne: true },
            }).lean()

            for (const sub of activeEndingSoon) {
                const user = await User.findById(sub.userId)
                if (user?.email) {
                    try {
                        await sendTrialEndingEmail(user.email, user.name, 3)
                    } catch (e) {
                        console.warn('[subscriptionCron] 3-day reminder email failed:', e.message)
                    }
                }
                await Subscription.findByIdAndUpdate(sub._id, { $set: { reminderSent: true } }) // [PAYMENT-v5.2] added
            }

            // Active subscriptions ending in 1 day
            const inOneDay = new Date(now)
            inOneDay.setDate(inOneDay.getDate() + 1)
            const activeEndingUrgent = await Subscription.find({
                status: { $in: ['active', 'trialing'] },
                endDate: { $gte: inOneDay, $lt: new Date(inOneDay.getTime() + 24 * 60 * 60 * 1000) },
                urgentReminderSent: { $ne: true },
            }).lean()

            for (const sub of activeEndingUrgent) {
                const user = await User.findById(sub.userId)
                if (user?.email) {
                    try {
                        await sendSubscriptionExpiredEmail(user.email, user.name)
                    } catch (e) {
                        console.warn('[subscriptionCron] 1-day reminder email failed:', e.message)
                    }
                }
                await Subscription.findByIdAndUpdate(sub._id, { $set: { urgentReminderSent: true } }) // [PAYMENT-v5.2] added
            }

            console.log(`[subscriptionCron] expired: ${expired.length}, ending3d: ${activeEndingSoon.length}, ending1d: ${activeEndingUrgent.length}`)
        } catch (err) {
            console.error('[subscriptionCron] error:', err.message)
        }
    })
}
