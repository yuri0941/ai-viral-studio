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

// Generic CRUD for owner entities
router.post('/:entity', createEntity)
router.patch('/:entity/:id', updateEntity)
router.delete('/:entity/:id', deleteEntity)

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
