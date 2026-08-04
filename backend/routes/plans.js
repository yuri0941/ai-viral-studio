import express from 'express'
import { protect } from '../middleware/auth.js'
import { PLANS } from '../config/plans.js'

const router = express.Router()

// [PLANS-SYNC] added: public prices endpoint
router.get('/', (req, res) => {
    const currency = req.query.currency || 'RUB'
    const plans = Object.values(PLANS).map(p => ({
        id: p.id,
        name: p.name,
        price: currency === 'USD' ? p.priceUSD : p.priceRUB,
        currency,
        generations: p.generations,
        socials: p.socials,
        features: p.features,
    }))
    res.json({ plans, currency })
})

// [PLANS-SYNC] added: owner/admin price editor (in-memory, restart resets)
router.patch('/:id', protect, async (req, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' })
    }
    const { priceRUB, priceUSD, generations, socials } = req.body
    const plan = PLANS[req.params.id]
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    if (priceRUB !== undefined) plan.priceRUB = Number(priceRUB)
    if (priceUSD !== undefined) plan.priceUSD = Number(priceUSD)
    if (generations !== undefined) plan.generations = Number(generations)
    if (socials !== undefined) plan.socials = Number(socials)

    res.json({ success: true, plan })
})

export default router
