import express from 'express'
import { protect, requireOwner } from '../middleware/auth.js'
import {
    calculateDynamicLimit,
    getROIBreakdown,
    getMRRForecast,
    getTransactions,
} from '../services/omegaFinance.js'

const router = express.Router()

router.get('/limit', protect, requireOwner, async (req, res) => {
    try {
        const mrr = Number(req.query.mrr) || 39690
        const limit = calculateDynamicLimit(mrr)
        const used = Number(req.query.used) || 320
        res.json({ status: 'success', data: { mrr, limit, used, remaining: Math.max(0, limit - used) } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/roi', protect, requireOwner, async (req, res) => {
    try {
        const data = await getROIBreakdown(req.user.id)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/forecast', protect, requireOwner, async (req, res) => {
    try {
        const days = Number(req.query.days) || 90
        const data = await getMRRForecast(req.user.id, days)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/transactions', protect, requireOwner, async (req, res) => {
    try {
        const { category, status, page, limit } = req.query
        const data = await getTransactions(req.user.id, { category, status, page: Number(page) || 1, limit: Number(limit) || 20 })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
