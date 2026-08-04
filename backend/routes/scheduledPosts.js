import express from 'express'
import { protect } from '../middleware/auth.js'
import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'
import { publishToTelegram } from '../services/telegramPublish.js'

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
        const { title, content, platform, platforms, scheduledDate, scheduledAt, status, mediaUrl, hashtags, types } = req.body || {}
        const post = await ScheduledPost.create({
            userId,
            title: title || 'Без названия',
            content: content || '',
            platforms: platforms || (platform ? [platform] : []),
            types: Array.isArray(types) ? types : (platforms || []).map(() => 'post'),
            scheduledAt: scheduledAt ? new Date(scheduledAt) : (scheduledDate ? new Date(scheduledDate) : new Date()),
            status: status || 'scheduled',
            mediaUrl: mediaUrl || '',
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
        const allowed = ['title', 'content', 'platforms', 'types', 'scheduledAt', 'scheduledDate', 'status', 'mediaUrl', 'hashtags', 'publishedUrl']
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

export default router
