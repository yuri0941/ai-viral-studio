import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import { validateSpawning, spawnBusiness } from '../services/businessSpawner.js'

const router = express.Router()

router.post('/spawn', protect, authorize('owner', 'admin', 'business'), async (req, res) => {
    try {
        const validation = await validateSpawning(req.user)
        if (!validation.ok) {
            return res.status(403).json({ status: 'error', message: validation.message })
        }

        const { niche, budgetFrom, budgetTo, audience, city, skipBoardroom } = req.body || {}
        const result = await spawnBusiness({
            niche,
            budgetFrom,
            budgetTo,
            audience,
            city,
            userId: req.user.id,
            skipBoardroom,
        })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
