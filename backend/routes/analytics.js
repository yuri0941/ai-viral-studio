import express from 'express'

const router = express.Router()

// Placeholder routes
router.get('/tiktok/:username', (req, res) => {
    res.json({ status: 'success', message: 'TikTok analytics' })
})

router.get('/youtube/:channelId', (req, res) => {
    res.json({ status: 'success', message: 'YouTube analytics' })
})

export default router