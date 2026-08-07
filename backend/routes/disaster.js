import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    runBackup,
    restoreFromBackup,
    listBackups,
    getBackupStatus,
    rollbackToPreviousVersion,
} from '../services/disasterRecovery.js'

const router = express.Router()

function requireOwner(req, res, next) {
    if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    next()
}

router.post('/backup/trigger', protect, requireOwner, async (req, res) => {
    try {
        const result = await runBackup()
        res.json(result)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/backup/status', protect, requireOwner, async (req, res) => {
    try {
        const status = await getBackupStatus()
        res.json(status)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/backup/list', protect, requireOwner, async (req, res) => {
    try {
        const backups = await listBackups()
        res.json({ backups })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/backup/restore', protect, requireOwner, async (req, res) => {
    try {
        const { date, pin } = req.body
        if (!pin) return res.status(400).json({ error: 'PIN required' })
        const result = await restoreFromBackup(date, pin)
        res.json(result)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/rollback', protect, requireOwner, async (req, res) => {
    try {
        const { tag } = req.body
        const result = await rollbackToPreviousVersion(tag || 'previous')
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
