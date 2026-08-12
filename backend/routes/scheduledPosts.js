import express from 'express'
import { protect } from '../middleware/auth.js'
import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'
import { publishToTelegram } from '../services/telegramPublish.js'
import { publishToPlatform } from '../services/platformPublisher.js'
import { getConnectedSocials, formatPlatformReasons } from '../utils/connectedSocials.js'

const router = express.Router()

// [MASTER-v5.0] added: real CRUD for scheduled posts
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const posts = await ScheduledPost.find({ userId }).sort({ scheduledAt: -1 }).lean()
        res.json({ status: 'success', data: posts })
    } catch (err) {
        console.error('[scheduledPosts:list]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.post('/', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const { title, content, platform, platforms, scheduledDate, scheduledAt, status, mediaUrl, mediaName, mediaType, hashtags, types } = req.body || {}
        const post = await ScheduledPost.create({
            userId,
            title: title || 'Без названия',
            content: content || '',
            platforms: platforms || (platform ? [platform] : []),
            types: Array.isArray(types) ? types : (platforms || []).map(() => 'post'),
            scheduledAt: scheduledAt ? new Date(scheduledAt) : (scheduledDate ? new Date(scheduledDate) : new Date()),
            status: status || 'scheduled',
            mediaUrl: mediaUrl || '',
            mediaName: mediaName || '',
            mediaType: mediaType || '',
            hashtags: hashtags || '',
        })
        res.status(201).json({ status: 'success', data: post })
    } catch (err) {
        console.error('[scheduledPosts:create]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.patch('/:id', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const updates = {}
        const allowed = ['title', 'content', 'platforms', 'types', 'scheduledAt', 'scheduledDate', 'status', 'mediaUrl', 'mediaName', 'mediaType', 'hashtags', 'publishedUrl']
        allowed.forEach(key => {
            if (req.body[key] !== undefined) {
                if (key === 'scheduledAt' || key === 'scheduledDate') {
                    updates.scheduledAt = new Date(req.body[key])
                } else {
                    updates[key] = req.body[key]
                }
            }
        })
        const post = await ScheduledPost.findOneAndUpdate(
            { _id: req.params.id, userId },
            { $set: updates },
            { new: true }
        ).lean()
        if (!post) return res.status(404).json({ status: 'error', error: 'Post not found' })
        res.json({ status: 'success', data: post })
    } catch (err) {
        console.error('[scheduledPosts:update]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.delete('/:id', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const post = await ScheduledPost.findOneAndDelete({ _id: req.params.id, userId })
        if (!post) return res.status(404).json({ status: 'error', error: 'Post not found' })
        res.json({ status: 'success', message: 'Deleted' })
    } catch (err) {
        console.error('[scheduledPosts:delete]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

// [MASTER-v5.0] added: publish scheduled post to Telegram
router.post('/:id/publish-telegram', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const post = await ScheduledPost.findOne({ _id: req.params.id, userId })
        if (!post) return res.status(404).json({ status: 'error', error: 'Post not found' })

        const user = await User.findById(userId).select('telegramBotToken telegramChatId')
        const botToken = req.body.botToken || user?.telegramBotToken
        const chatId = req.body.chatId || user?.telegramChatId
        if (!botToken || !chatId) {
            return res.status(400).json({ status: 'error', error: 'Telegram bot token и chat ID не настроены' })
        }

        const text = `${post.title}\n\n${post.content || ''}\n\n${post.hashtags || ''}`
        const result = await publishToTelegram(botToken, chatId, text, post.mediaUrl)
        post.status = 'published'
        await post.save()
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[scheduledPosts:publish-telegram]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

// [MASTER-v5.0] added: send a test Telegram message
router.post('/telegram-test', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const user = await User.findById(userId).select('telegramBotToken telegramChatId name')
        const botToken = req.body.botToken || user?.telegramBotToken
        const chatId = req.body.chatId || user?.telegramChatId
        if (!botToken || !chatId) {
            return res.status(400).json({ status: 'error', error: 'Telegram bot token и chat ID не настроены' })
        }

        const text = `🧪 Тестовое сообщение от AI Viral Studio${user?.name ? ` для ${user.name}` : ''}`
        const result = await publishToTelegram(botToken, chatId, text)
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[scheduledPosts:telegram-test]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

// [SOCIAL-v5.1] added: publish to connected social platforms (VK/Telegram via user.socials)
// [v9.9.19.15.10] atomic status capture to prevent VersionError 500 and duplicate wall.posts
router.post('/:id/publish', protect, async (req, res) => {
    const userId = req.user?._id || req.user?.id
    const now = new Date()

    try {
        const captured = await ScheduledPost.findOneAndUpdate(
            { _id: req.params.id, userId, status: { $in: ['scheduled', 'failed', 'cancelled'] }, hidden: { $ne: true } },
            { $set: { status: 'publishing', publishStartedAt: now } },
            { new: true }
        )

        if (!captured) {
            const existing = await ScheduledPost.findOne({ _id: req.params.id, userId }).lean()
            if (!existing) return res.status(404).json({ status: 'error', error: 'Post not found' })
            return res.status(409).json({ status: 'error', error: 'already_publishing_or_published', data: { status: existing.status } })
        }

        const user = await User.findById(userId)
            .select('+vkToken +vkRefreshToken +vkUserId +vkCommunityKey vkGroupId vkConnected telegramBotToken telegramChatId telegramId preferences.language')
        if (!user) {
            await ScheduledPost.updateOne({ _id: captured._id }, { $set: { status: 'failed', errorMessage: 'User not found' } })
            return res.status(404).json({ status: 'error', error: 'User not found' })
        }

        // [v9.9.19.15.2] единый источник правды о подключённых соцсетях
        const socialStatus = await getConnectedSocials(user)
        const platforms = req.body.platforms || captured.platforms || []
        const results = []

        for (const platform of platforms) {
            const status = socialStatus[platform]

            // [v9.9.19.15.17] globally disabled platform — silent skip
            if (status?.disabled) {
                results.push({
                    platform,
                    status: 'skipped',
                    result: { success: false, skipped: true, error: 'vk_disabled', reason: status.reason }
                })
                continue
            }

            if (status && !status.connected) {
                results.push({
                    platform,
                    status: 'error',
                    error: status.reason,
                    result: {
                        success: false,
                        error: `${platform}_not_connected`,
                        reason: status.reason,
                        hint: formatPlatformReasons({ [platform]: status }, socialStatus.language)
                    }
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

        const published = results.filter(r => r.status === 'published')
        const finalStatus = published.length > 0 ? 'published' : 'failed'
        const publishedUrl = published[0]?.result?.postUrl || ''
        const errorMessage = finalStatus === 'failed'
            ? results.map(r => `${r.platform}: ${r.error || r.result?.error || r.result?.reason || 'failed'}`).join('; ')
            : ''

        await ScheduledPost.updateOne(
            { _id: captured._id },
            { $set: { status: finalStatus, publishResults: results, publishedAt: new Date(), publishedUrl, errorMessage } }
        )

        if (finalStatus === 'published') {
            return res.json({ status: 'success', data: { results, publishedUrl } })
        }
        return res.status(400).json({ status: 'error', error: errorMessage || 'Publish failed', data: { results, publishedUrl } })
    } catch (err) {
        console.error('[scheduledPosts:publish]', err.message)
        try {
            await ScheduledPost.updateOne({ _id: req.params.id, userId }, { $set: { status: 'failed', errorMessage: err.message } })
        } catch (updateErr) {
            console.error('[scheduledPosts:publish] failed to mark post as failed:', updateErr.message)
        }
        return res.status(200).json({ status: 'error', error: err.message || 'Publish error' })
    }
})

export default router
