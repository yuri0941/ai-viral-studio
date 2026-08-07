import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// [v6.6-PART2] Creator analytics endpoint — never returns 401 for valid users
router.get('/analytics/overview', protect, async (req, res) => {
    try {
        // For new creators return zeros; extend later with real aggregates
        return res.status(200).json({
            status: 'success',
            data: {
                posts: 0,
                views: 0,
                ctr: 0,
                subscribers: 0,
                engagement: 0,
                income: 0,
            }
        })
    } catch (error) {
        console.error('[creator/analytics] error:', error.message)
        return res.status(500).json({
            status: 'error',
            error: error.message || 'Analytics unavailable'
        })
    }
})

export default router
