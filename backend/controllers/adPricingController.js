import { AdPricing } from '../models/index.js'

export const getAdPricing = async (req, res) => {
    try {
        const ownerId = req.user.id
        let pricing = await AdPricing.findOne({ ownerId }).lean()
        if (!pricing) {
            pricing = { ownerId, cpm: 0, cpc: 0, cpa: 0, fixedMonth: 0, currency: 'RUB' }
        }
        res.json({ status: 'success', data: pricing })
    } catch (err) {
        console.error('[adPricing] get failed:', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export const updateAdPricing = async (req, res) => {
    try {
        const ownerId = req.user.id
        const { cpm, cpc, cpa, fixedMonth, currency } = req.body || {}

        const updates = {}
        if (typeof cpm === 'number') updates.cpm = Math.max(0, cpm)
        if (typeof cpc === 'number') updates.cpc = Math.max(0, cpc)
        if (typeof cpa === 'number') updates.cpa = Math.max(0, cpa)
        if (typeof fixedMonth === 'number') updates.fixedMonth = Math.max(0, fixedMonth)
        if (currency && ['RUB', 'USD', 'EUR'].includes(currency)) updates.currency = currency

        const pricing = await AdPricing.findOneAndUpdate(
            { ownerId },
            { ownerId, ...updates },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        res.json({ status: 'success', data: pricing })
    } catch (err) {
        console.error('[adPricing] update failed:', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { getAdPricing, updateAdPricing }
