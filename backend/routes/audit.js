import express from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import AuditLog from '../models/AuditLog.js'
import { ExportService } from '../services/exportService.js'

const router = express.Router()

router.get('/export', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        let logs = []
        try {
            logs = await AuditLog.find().sort({ timestamp: -1 }).limit(1000).lean()
        } catch (e) {
            console.warn('[audit/export] AuditLog query failed:', e.message)
            logs = [{ message: 'AuditLog model not configured yet', createdAt: new Date() }]
        }

        if (req.query.download === 'csv') {
            const csv = ExportService.toCSV(logs, {
                customHeaders: { metadata: 'Дополнительные данные' },
            })
            const filename = `Отчёт_аудит_${new Date().toLocaleDateString('ru-RU')}.csv`
            return ExportService.sendCSV(res, csv, filename)
        }

        res.json({ success: true, logs, count: logs.length })
    } catch (err) {
        console.error('[audit/export]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
