// [P1.5-METRICS] публичный beacon посещения лендинга. Без авторизации, без персональных данных,
// IP в БД не хранится (rate-limit только в памяти процесса).
import express from 'express'
import rateLimit from 'express-rate-limit'
import { trackVisit } from '../services/metricsService.js'

const router = express.Router()

const visitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests' },
})

router.post('/visit', visitLimiter, async (req, res) => {
    try {
        await trackVisit()
    } catch (e) {
        console.warn('[metrics] visit track failed:', e.message)
    }
    // Всегда 204: метрика не должна влиять на клиент
    res.status(204).end()
})

export default router
