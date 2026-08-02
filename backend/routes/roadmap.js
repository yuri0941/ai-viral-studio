import express from 'express'
import crypto from 'crypto'
import { RoadmapVote } from '../models/index.js'

const router = express.Router()

const DEFAULT_FEATURES = [
    { featureId: 'auto-posting', featureTitle: 'Автопостинг в 8+ соцсетей', status: 'in_progress', votes: 42 },
    { featureId: 'brand-voice', featureTitle: 'Brand Voice v2 — тон бренда', status: 'launched', votes: 38 },
    { featureId: 'tiktok-analytics', featureTitle: 'Аналитика TikTok', status: 'testing', votes: 31 },
    { featureId: 'ai-boardroom', featureTitle: 'AI Boardroom для стратегии', status: 'planned', votes: 27 },
    { featureId: 'viral-chat', featureTitle: 'Viral Chat — идеи на лету', status: 'in_progress', votes: 25 },
    { featureId: 'scheduler-ai', featureTitle: 'AI-планировщик публикаций', status: 'planned', votes: 22 },
    { featureId: 'competitor-analysis', featureTitle: 'Анализ конкурентов', status: 'launched', votes: 19 },
    { featureId: 'pwa-offline', featureTitle: 'PWA-режим офлайн', status: 'planned', votes: 15 },
    { featureId: 'ab-testing', featureTitle: 'A/B тесты контента', status: 'testing', votes: 12 },
    { featureId: 'white-label', featureTitle: 'White-label для агентств', status: 'in_progress', votes: 9 },
]

async function seedRoadmap() {
    for (const f of DEFAULT_FEATURES) {
        await RoadmapVote.findOneAndUpdate(
            { featureId: f.featureId },
            { $setOnInsert: f },
            { upsert: true, new: true }
        )
    }
}

function hashIp(ip) {
    return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16)
}

// GET /api/roadmap — все фичи roadmap
router.get('/', async (req, res) => {
    try {
        await seedRoadmap()
        const features = await RoadmapVote.find().sort({ votes: -1 })
        res.json({ success: true, data: { features } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/roadmap/:featureId/vote — голосовать за фичу (1 голос per IP)
router.post('/:featureId/vote', async (req, res) => {
    try {
        const { featureId } = req.params
        const ipHash = hashIp(req.ip || req.headers['x-forwarded-for'] || 'unknown')

        await seedRoadmap()

        const feature = await RoadmapVote.findOne({ featureId })
        if (!feature) {
            return res.status(404).json({ success: false, message: 'Feature not found' })
        }

        if (feature.voterIps.includes(ipHash)) {
            return res.status(409).json({ success: false, message: 'Already voted from this IP' })
        }

        feature.voterIps.push(ipHash)
        feature.votes += 1
        await feature.save()

        res.json({ success: true, data: { featureId, votes: feature.votes } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// GET /api/roadmap/top — топ-5 фичей по голосам (приоритет спринта)
router.get('/top', async (req, res) => {
    try {
        await seedRoadmap()
        const top = await RoadmapVote.find().sort({ votes: -1 }).limit(5)
        res.json({ success: true, data: { features: top } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
