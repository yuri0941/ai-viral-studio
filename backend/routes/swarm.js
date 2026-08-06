import express from 'express'
import { protect } from '../middleware/auth.js'
import { globalDirector } from '../ai/omega/swarmDirector.js'

const router = express.Router()

router.get('/swarm/agents', protect, (req, res) => {
    try {
        // Seed 6 realistic agents if none exist
        if (globalDirector.getAgents().length === 0) {
            globalDirector.spawnAgent('researcher', 'Анализирую тренды Reels 2026')
            globalDirector.spawnAgent('coder', 'Оптимизирую OmegaChat.jsx')
            globalDirector.spawnAgent('designer', 'Генерирую glassmorphism-тему v7')
            globalDirector.spawnAgent('tester', 'Пишу E2E тесты для checkout')
            globalDirector.spawnAgent('marketer', 'Готовлю email-кампанию запуска')
            globalDirector.spawnAgent('analyst', 'Агрегирую CTR по нишам из 50+ постов')
        }
        const filter = req.query.filter || 'all'
        res.json({ status: 'success', data: globalDirector.getAgents(filter) })
    } catch (err) {
        console.error('[swarm/agents]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/swarm/spawn', protect, (req, res) => {
    try {
        const { role, task, priority } = req.body
        const agent = globalDirector.spawnAgent(role, task, priority)
        res.json({ status: 'success', data: agent })
    } catch (err) {
        console.error('[swarm/spawn]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/swarm/:id/kill', protect, (req, res) => {
    try {
        const result = globalDirector.killAgent(req.params.id)
        if (!result) return res.status(404).json({ status: 'error', message: 'Agent not found' })
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[swarm/kill]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/swarm/:id/pause', protect, (req, res) => {
    try {
        const agent = globalDirector.pauseAgent(req.params.id)
        if (!agent) return res.status(404).json({ status: 'error', message: 'Agent not found' })
        res.json({ status: 'success', data: agent })
    } catch (err) {
        console.error('[swarm/pause]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/swarm/:id/logs', protect, async (req, res) => {
    try {
        const logs = await globalDirector.getLogs(req.params.id, parseInt(req.query.limit || '50'))
        res.json({ status: 'success', data: logs })
    } catch (err) {
        console.error('[swarm/logs]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
