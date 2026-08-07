import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import AuditLog from '../models/AuditLog.js'
import { ExportService } from '../services/exportService.js'

const router = express.Router()

router.get('/export', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).lean()
        const csv = ExportService.toCSV(logs, {
            customHeaders: { metadata: 'Дополнительные данные' },
        })
        const filename = `Отчёт_аудит_${new Date().toLocaleDateString('ru-RU')}.csv`
        ExportService.sendCSV(res, csv, filename)
    } catch (err) {
        console.error('[audit/export]', err.message)
        res.status(500).json({ error: err.message })
    }
})

export default router
