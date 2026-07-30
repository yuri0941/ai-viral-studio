import express from 'express'
import { searchVideos, getVideoStats, getTrending, analyzeNiche } from '../services/youtubeService.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Все роуты защищены JWT
router.use(protect)

// GET /api/youtube/search?q=query&maxResults=10
router.get('/search', async (req, res) => {
    try {
        const { q, maxResults } = req.query
        if (!q) {
            return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' })
        }
        const result = await searchVideos(q, parseInt(maxResults) || 10)
        res.json(result)
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})

// GET /api/youtube/stats/:videoId
router.get('/stats/:videoId', async (req, res) => {
    try {
        const result = await getVideoStats(req.params.videoId)
        res.json(result)
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})

// GET /api/youtube/trending?region=RU&category=10
router.get('/trending', async (req, res) => {
    try {
        const { region, category } = req.query
        const result = await getTrending(region || 'RU', category)
        res.json(result)
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})

// GET /api/youtube/analyze?q=niche+query
router.get('/analyze', async (req, res) => {
    try {
        const { q } = req.query
        if (!q) {
            return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' })
        }
        const result = await analyzeNiche(q)
        res.json(result)
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})

export default router