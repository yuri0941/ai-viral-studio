import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import {
    getStatus,
    postWhatsApp,
    postWhatsAppBroadcast,
    postSlack,
    postDiscord,
    postNotion,
    postClickUp,
    postTrello,
    getShopify,
    getWebhooks,
    postWebhook,
    patchWebhook,
    deleteWebhookById,
    postWebhookTrigger,
} from '../controllers/integrationsController.js'

const router = express.Router()

router.get('/status', protect, getStatus)

router.post('/whatsapp/send', protect, authorize('owner', 'admin', 'business'), postWhatsApp)
router.post('/whatsapp/broadcast', protect, authorize('owner', 'admin', 'business'), postWhatsAppBroadcast)
router.post('/slack/send', protect, authorize('owner', 'admin'), postSlack)
router.post('/discord/send', protect, authorize('owner', 'admin'), postDiscord)
router.post('/notion/page', protect, authorize('owner', 'admin', 'business'), postNotion)
router.post('/clickup/task', protect, authorize('owner', 'admin', 'business'), postClickUp)
router.post('/trello/card', protect, authorize('owner', 'admin', 'business'), postTrello)
router.get('/shopify/products', protect, authorize('owner', 'admin', 'business'), getShopify)

router.get('/webhooks', protect, getWebhooks)
router.post('/webhooks', protect, authorize('owner', 'admin', 'business'), postWebhook)
router.patch('/webhooks/:id', protect, authorize('owner', 'admin', 'business'), patchWebhook)
router.delete('/webhooks/:id', protect, authorize('owner', 'admin', 'business'), deleteWebhookById)
router.post('/webhooks/trigger', protect, authorize('owner', 'admin', 'business'), postWebhookTrigger)

export default router
