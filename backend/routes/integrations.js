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
import Integration from '../models/Integration.js'
import { encrypt, decrypt } from '../utils/crypto.js'

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

// [SOCIAL-v5.1] added social integrations
router.get('/my', protect, async (req, res) => {
    try {
        const integrations = await Integration.find({ userId: req.user.id })
        res.json(integrations.map(i => ({
            provider: i.provider,
            accountName: i.accountName,
            isActive: i.isActive,
            connectedAt: i.createdAt,
        })))
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.post('/telegram/connect', protect, async (req, res) => {
    try {
        const { botToken, chatId } = req.body
        const test = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
        const data = await test.json()
        if (!data.ok) return res.status(400).json({ error: 'Invalid bot token' })

        await Integration.findOneAndUpdate(
            { userId: req.user.id, provider: 'telegram' },
            {
                userId: req.user.id,
                provider: 'telegram',
                accessToken: encrypt(botToken),
                accountId: chatId,
                accountName: data.result.username,
                connected: true,
                status: 'active',
            },
            { upsert: true, new: true }
        )
        res.json({ success: true, accountName: data.result.username })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.get('/vk/auth', protect, (req, res) => {
    const url = `https://oauth.vk.com/authorize?client_id=${process.env.VK_APP_ID}&redirect_uri=${process.env.FRONTEND_URL}/integrations/vk/callback&scope=wall,photos,video&response_type=code&state=${req.user.id}`
    res.redirect(url)
})

router.get('/vk/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query
        const tokenRes = await fetch(`https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID}&client_secret=${process.env.VK_APP_SECRET}&redirect_uri=${process.env.FRONTEND_URL}/integrations/vk/callback&code=${code}`)
        const data = await tokenRes.json()
        if (data.error) throw new Error(data.error_description || data.error)

        await Integration.findOneAndUpdate(
            { userId, provider: 'vk' },
            { userId, provider: 'vk', accessToken: encrypt(data.access_token), accountId: String(data.user_id), accountName: `vk${data.user_id}`, connected: true, status: 'active' },
            { upsert: true, new: true }
        )
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&success=vk`)
    } catch (e) {
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&error=vk`)
    }
})

router.get('/linkedin/auth', protect, (req, res) => {
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.FRONTEND_URL}/integrations/linkedin/callback&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${req.user.id}`
    res.redirect(url)
})

router.get('/linkedin/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${process.env.FRONTEND_URL}/integrations/linkedin/callback&client_id=${process.env.LINKEDIN_CLIENT_ID}&client_secret=${process.env.LINKEDIN_CLIENT_SECRET}`,
        })
        const data = await tokenRes.json()
        if (data.error) throw new Error(data.error_description || data.error)

        await Integration.findOneAndUpdate(
            { userId, provider: 'linkedin' },
            { userId, provider: 'linkedin', accessToken: encrypt(data.access_token), refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000), connected: true, status: 'active' },
            { upsert: true, new: true }
        )
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&success=linkedin`)
    } catch (e) {
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&error=linkedin`)
    }
})

router.delete('/:provider', protect, async (req, res) => {
    try {
        await Integration.findOneAndDelete({ userId: req.user.id, provider: req.params.provider })
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
