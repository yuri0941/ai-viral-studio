import express from 'express'
import { protect } from '../middleware/auth.js'
import { getMetrics, getMetricsHistory } from '../services/monitoringService.js'
import { getResourceStatus, getOperationHistory, setAutoUpgrade, runResourceChecks } from '../services/omegaResourceManager.js'
import fs from 'fs/promises'
import path from 'path'

const router = express.Router()

function requireOwner(req, res, next) {
    if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    next()
}

router.get('/metrics', protect, requireOwner, async (req, res) => {
    try {
        res.json({
            current: getMetrics(),
            history: getMetricsHistory(),
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/logs', protect, requireOwner, async (req, res) => {
    try {
        const logPath = path.resolve('logs/app.log')
        let lines = []
        try {
            const text = await fs.readFile(logPath, 'utf-8')
            lines = text.split(/\r?\n/).slice(-1000)
        } catch {
            // no logs file
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.send(lines.join('\n'))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/resources', protect, requireOwner, async (req, res) => {
    try {
        const status = await getResourceStatus()
        res.json({ ...status, history: getOperationHistory() })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/resources/auto-upgrade', protect, requireOwner, async (req, res) => {
    try {
        const { enabled, limitRUB } = req.body
        const result = setAutoUpgrade(enabled, limitRUB)
        res.json({ success: true, ...result })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/resources/check', protect, requireOwner, async (req, res) => {
    try {
        const status = await runResourceChecks()
        res.json({ ...status, history: getOperationHistory() })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
