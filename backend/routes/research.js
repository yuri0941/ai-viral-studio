import express from 'express'
import { protect } from '../middleware/auth.js'
import { ResearchLog } from '../../models/ResearchLog.js'
import webResearchEngine from '../ai/omega/webResearchEngine.js'

const router = express.Router()

function ownerOnly(req, res, next) {
    if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
    next()
}

router.get('/research/status', protect, async (req, res) => {
    try {
        const current = await ResearchLog.findOne().sort({ createdAt: -1 }).lean()
        res.json({
            status: 'success',
            data: {
                currentTopic: current?.topic || 'AI marketing trends 2026',
                progress: 67,
                lastUpdate: current?.createdAt || new Date().toISOString(),
            }
        })
    } catch (err) {
        console.error('[research/status]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/research/logs', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1')
        const limit = parseInt(req.query.limit || '20')
        const type = req.query.type
        const filter = type ? { type } : {}
        const logs = await ResearchLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
        const total = await ResearchLog.countDocuments(filter)
        res.json({ status: 'success', data: { logs, total, page, limit } })
    } catch (err) {
        console.error('[research/logs]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/research/trigger', protect, ownerOnly, async (req, res) => {
    try {
        const { topic, depth } = req.body
        const result = await webResearchEngine.researchTopic(topic || 'AI marketing trends 2026', depth || 3)
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[research/trigger]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/research/insights', protect, async (req, res) => {
    try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const logs = await ResearchLog.find({ createdAt: { $gte: weekAgo } }).sort({ confidence: -1 }).limit(5).lean()
        res.json({ status: 'success', data: logs })
    } catch (err) {
        console.error('[research/insights]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
