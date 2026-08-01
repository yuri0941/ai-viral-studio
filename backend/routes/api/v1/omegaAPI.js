import express from 'express'
import { protect, authorize } from '../../../middleware/auth.js'
import {
    validateApiKey,
    rateLimitApiKey,
    getStatus,
    postChat,
    postGenerate,
    listMyKeys,
    createKey,
    updateKey,
    deleteKey,
    addWebhook,
    removeWebhook,
    getDocs,
} from '../../../controllers/omegaAPIController.js'

const router = express.Router()

// Public docs (no auth required)
router.get('/docs', getDocs)

// B2B2B endpoints — require valid API key
router.get('/status', validateApiKey, rateLimitApiKey, getStatus)
router.post('/chat', validateApiKey, rateLimitApiKey, postChat)
router.post('/generate', validateApiKey, rateLimitApiKey, postGenerate)

// Developer key management (authenticated owner/admin)
router.get('/keys', protect, authorize('owner', 'admin', 'business'), listMyKeys)
router.post('/keys', protect, authorize('owner', 'admin', 'business'), createKey)
router.patch('/keys/:id', protect, authorize('owner', 'admin', 'business'), updateKey)
router.delete('/keys/:id', protect, authorize('owner', 'admin', 'business'), deleteKey)
router.post('/keys/:id/webhooks', protect, authorize('owner', 'admin', 'business'), addWebhook)
router.delete('/keys/:id/webhooks/:webhookId', protect, authorize('owner', 'admin', 'business'), removeWebhook)

export default router
