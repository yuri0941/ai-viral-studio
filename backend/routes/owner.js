import express from 'express'
import {
    getOverview,
    getFinance,
    getTeam,
    getServers,
    getIntegrations,
    getAudit,
    getAgents,
    getPromos,
    getNews,
    getSubscriptions,
    createEntity,
    updateEntity,
    deleteEntity,
} from '../controllers/ownerController.js'
import { protect, authorize } from '../middleware/auth.js'
import { getProviderStatus, toggleProvider } from '../controllers/aiProviderController.js'
import { getAdPricing, updateAdPricing } from '../controllers/adPricingController.js'
import { updatePlanPrice } from '../controllers/subscriptionController.js'

import { getOwnerSettings, updateOwnerSettings } from '../controllers/ownerSettingsController.js'
import { ApiKey } from '../models/index.js'
import { invalidateApiKeysCache } from '../services/aiService.js'

const router = express.Router()

// Owner dashboard data
router.get('/overview', getOverview)
router.get('/finance', getFinance)
router.get('/team', getTeam)
router.get('/servers', getServers)
router.get('/integrations', getIntegrations)
router.get('/audit', getAudit)
router.get('/agents', getAgents)
router.get('/promos', getPromos)
router.get('/news', getNews)
router.get('/subscriptions', getSubscriptions)
router.patch('/subscription-plans/:planId', protect, authorize('owner', 'admin'), (req, res, next) => {
    req.body = { ...req.body, planId: req.params.planId }
    return updatePlanPrice(req, res, next)
})

// Owner settings (OMEGA features toggles)
router.get('/settings', protect, authorize('owner', 'admin'), getOwnerSettings)
router.put('/settings', protect, authorize('owner', 'admin'), updateOwnerSettings)

// AI Provider toggles & real status
router.get('/ai-providers/status', protect, authorize('owner', 'admin'), getProviderStatus)
router.post('/ai-providers/:id/toggle', protect, authorize('owner', 'admin'), toggleProvider)

// Ad pricing
router.get('/ad-pricing', protect, authorize('owner', 'admin'), getAdPricing)
router.put('/ad-pricing', protect, authorize('owner', 'admin'), updateAdPricing)

// Generic CRUD for owner entities
router.post('/:entity', createEntity)
router.patch('/:entity/:id', updateEntity)
router.delete('/:entity/:id', deleteEntity)

// [P17] added: owner-scoped API key storage
router.patch('/api-keys/:provider', protect, authorize('owner', 'admin'), async (req, res) => {
    const { provider } = req.params
    const ownerId = req.user?._id
    const { keyValue } = req.body || {}
    if (!keyValue || keyValue.length < 4) return res.status(400).json({ success: false, message: 'Invalid key' })
    try {
        await ApiKey.findOneAndUpdate(
            { ownerId, provider },
            { ownerId, provider, keyValue, key: keyValue, label: provider.toUpperCase(), isActive: true, updatedAt: new Date() },
            { upsert: true, new: true }
        )
        invalidateApiKeysCache?.()
        res.json({ success: true })
    } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// AI Provider health check (used by OMEGA Core tab)
router.get('/omega/health', (req, res) => {
    const provider = req.query.provider || 'groq'
    const keyVar = `${provider.toUpperCase()}_API_KEY`
    const enabledVar = `${provider.toUpperCase()}_ENABLED`
    const hasKey = !!process.env[keyVar]
    const enabled = process.env[enabledVar] === 'true'

    res.json({
        status: 'success',
        data: {
            provider,
            status: hasKey && enabled ? 'ok' : 'disabled',
            hasKey,
            enabled,
        },
    })
})

export default router
