import express from 'express'
import { protect, requireOwner } from '../middleware/auth.js'
import { generateCover, publishPhotoToTelegram, publishVideoToTelegram } from '../services/mediaPublisher.js'
import { getOwnerBot } from '../services/ownerBot.js'

const router = express.Router()

router.get('/cover', protect, async (req, res) => {
    try {
        const { prompt, width = 1024, height = 1024, seed } = req.query
        if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' })
        const buffer = await generateCover(prompt, Number(width), Number(height), seed)
        res.set('Content-Type', 'image/jpeg')
        res.send(buffer)
    } catch (e) {
        console.error('[media/cover]', e.message)
        res.status(500).json({ success: false, error: e.message })
    }
})

router.post('/publish/photo', protect, requireOwner, async (req, res) => {
    try {
        const { channelId, imageUrl, caption } = req.body
        const ownerBot = getOwnerBot()
        if (!ownerBot || !ownerBot.token) throw new Error('Owner bot not configured')
        let buffer
        if (imageUrl) {
            const { data } = await import('axios').then(m => m.default.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 }))
            buffer = Buffer.from(data)
        } else {
            buffer = await generateCover(caption || 'AI Viral Studio cover')
        }
        const result = await publishPhotoToTelegram(ownerBot, channelId, buffer, caption, { parseMode: 'HTML' })
        res.json({ success: true, result })
    } catch (e) {
        console.error('[media/publish/photo]', e.message)
        res.status(500).json({ success: false, error: e.message })
    }
})

router.post('/publish/video', protect, requireOwner, async (req, res) => {
    try {
        const { channelId, videoUrl, caption } = req.body
        const ownerBot = getOwnerBot()
        if (!ownerBot || !ownerBot.token) throw new Error('Owner bot not configured')
        const { data } = await import('axios').then(m => m.default.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 }))
        const buffer = Buffer.from(data)
        const result = await publishVideoToTelegram(ownerBot, channelId, buffer, caption, { parseMode: 'HTML' })
        res.json({ success: true, result })
    } catch (e) {
        console.error('[media/publish/video]', e.message)
        res.status(500).json({ success: false, error: e.message })
    }
})

export default router
