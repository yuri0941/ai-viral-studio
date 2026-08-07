import express from 'express'
import crypto from 'crypto'
import { RoadmapVote } from '../models/index.js'
import RoadmapItem from '../models/RoadmapItem.js'
import { protect, requireOwner } from '../middleware/auth.js'
import { seedDefaultRoadmap, analyzeRisks, recalculateETAs } from '../services/roadmapEngine.js'

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

// ============ OWNER-ONLY 6-MONTH ROADMAP ENGINE ============
router.use('/items', protect, requireOwner)

// GET /api/roadmap/items — все roadmap items
router.get('/items', async (req, res) => {
    try {
        await seedDefaultRoadmap()
        const items = await RoadmapItem.find().sort({ month: 1, priority: 1, createdAt: -1 })
        res.json({ success: true, data: { items } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/roadmap/items — создать item
router.post('/items', async (req, res) => {
    try {
        const { title, description, phase, priority, eta, dependencies, risks, mitigation, progress, month } = req.body
        if (!title) return res.status(400).json({ success: false, message: 'Title required' })
        const item = await RoadmapItem.create({
            title,
            description: description || '',
            phase: phase || 'planned',
            priority: priority || 'medium',
            eta: eta ? new Date(eta) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            dependencies: dependencies || [],
            risks: risks || [],
            mitigation: mitigation || [],
            progress: progress ?? 0,
            createdBy: 'owner',
            approved: true,
            month: month || 1,
        })
        res.json({ success: true, data: { item } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/roadmap/items/analyze — OMEGA анализ рисков
router.post('/items/analyze', async (req, res) => {
    try {
        await seedDefaultRoadmap()
        const items = await RoadmapItem.find().lean()
        const warnings = analyzeRisks(items)
        res.json({ success: true, data: { warnings, count: warnings.length } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// PATCH /api/roadmap/items/:id — обновить item
router.patch('/items/:id', async (req, res) => {
    try {
        const { id } = req.params
        const updates = { ...req.body }
        if (updates.eta) updates.eta = new Date(updates.eta)
        const item = await RoadmapItem.findByIdAndUpdate(id, { $set: updates }, { new: true })
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' })
        res.json({ success: true, data: { item } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// DELETE /api/roadmap/items/:id — удалить item
router.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params
        const item = await RoadmapItem.findByIdAndDelete(id)
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' })
        res.json({ success: true, data: { deleted: true } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/roadmap/items/recalculate — пересчёт ETA
router.post('/items/recalculate', async (req, res) => {
    try {
        let items = await RoadmapItem.find().lean()
        items = await recalculateETAs(items)
        for (const item of items) {
            await RoadmapItem.findByIdAndUpdate(item._id, { eta: item.eta })
        }
        res.json({ success: true, data: { items } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
