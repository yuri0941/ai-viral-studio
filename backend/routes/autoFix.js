import express from 'express'
import { protect } from '../middleware/auth.js'
import { scanForErrors, getStatus, getLogs, approveFix, rejectFix } from '../ai/omega/autoFixAgent.js'

const router = express.Router()

function ownerOnly(req, res, next) {
    if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
    next()
}

router.get('/autofix/status', protect, ownerOnly, async (req, res) => {
    try {
        const status = await getStatus()
        res.json({ status: 'success', data: status })
    } catch (err) {
        console.error('[autofix/status]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/autofix/logs', protect, ownerOnly, async (req, res) => {
    try {
        const filter = req.query.filter ? JSON.parse(req.query.filter) : {}
        const logs = await getLogs(filter)
        res.json({ status: 'success', data: logs })
    } catch (err) {
        console.error('[autofix/logs]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/autofix/:id/approve', protect, ownerOnly, async (req, res) => {
    try {
        const log = await approveFix(req.params.id)
        if (!log) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: log })
    } catch (err) {
        console.error('[autofix/approve]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/autofix/:id/reject', protect, ownerOnly, async (req, res) => {
    try {
        const log = await rejectFix(req.params.id)
        if (!log) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: log })
    } catch (err) {
        console.error('[autofix/reject]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/autofix/scan', protect, ownerOnly, async (req, res) => {
    try {
        const result = await scanForErrors()
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[autofix/scan]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
