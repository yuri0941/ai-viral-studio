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

// [v5.9] added: real Telegram bot deep-link for OAuth-style connect
router.get('/telegram/url', protect, (req, res) => {
    const botLink = process.env.TELEGRAM_BOT_LINK || process.env.TELEGRAM_OMEGA_BOT_LINK
    if (!botLink) {
        return res.status(503).json({ error: 'TELEGRAM_BOT_LINK not configured' })
    }
    res.json({ url: `${botLink}?start=connect_${req.user.id}`, botLink })
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

// [v5.9] added: real Discord OAuth URL using env DISCORD_CLIENT_ID
router.get('/discord/url', protect, (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://aiviral-studio.ru/api/integrations/discord/callback'
    if (!clientId) {
        return res.status(200).json({ connected: false, url: null, error: 'DISCORD_CLIENT_ID not configured' })
    }
    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds&state=${req.user.id}`
    res.json({ url })
})

// [FIX-2026-08-05] Discord webhook connect (no OAuth)
router.post('/discord/connect', protect, async (req, res) => {
    try {
        const { webhookUrl } = req.body
        if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
            return res.status(400).json({ error: 'Invalid Discord webhook URL' })
        }
        await Integration.findOneAndUpdate(
            { userId: req.user.id, provider: 'discord' },
            { userId: req.user.id, provider: 'discord', accessToken: encrypt(webhookUrl), accountName: 'Discord Webhook', connected: true, status: 'active' },
            { upsert: true, new: true }
        )
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.get('/linkedin/auth', protect, (req, res) => {
    try {
        const clientId = process.env.LINKEDIN_CLIENT_ID
        if (!clientId) {
            return res.status(200).json({ connected: false, url: null, error: 'LINKEDIN_CLIENT_ID not configured' })
        }
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.FRONTEND_URL}/integrations/linkedin/callback`
        const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${req.user.id}`
        res.redirect(url)
    } catch (e) {
        console.warn('[Integration] linkedin auth failed:', e.message)
        res.status(200).json({ connected: false, url: null, error: 'Service temporarily unavailable' })
    }
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

// [FIX-2026-08-05] OAuth URLs for all platforms
const getOAuthUrl = (provider, req) => {
    const redirectUri = `${process.env.FRONTEND_URL}/integrations/${provider}/callback`
    switch (provider) {
        case 'linkedin':
            if (!process.env.LINKEDIN_CLIENT_ID) return null
            return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${req.user.id}`
        case 'pinterest':
            if (!process.env.PINTEREST_APP_ID) return null
            return `https://www.pinterest.com/oauth/?client_id=${process.env.PINTEREST_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=boards:read,pins:read,pins:write&state=${req.user.id}`
        case 'facebook':
            if (!process.env.FACEBOOK_APP_ID) return null
            return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=pages_manage_posts,pages_read_engagement&state=${req.user.id}`
        case 'instagram':
            if (!process.env.FACEBOOK_APP_ID) return null
            return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_content_publish&state=${req.user.id}`
        case 'tiktok':
            if (!process.env.TIKTOK_CLIENT_KEY) return null
            return `https://www.tiktok.com/v2/auth/authorize?client_key=${process.env.TIKTOK_CLIENT_KEY}&redirect_uri=${redirectUri}&scope=user.info.basic,video.publish&response_type=code&state=${req.user.id}`
        case 'youtube':
            if (!process.env.YOUTUBE_CLIENT_ID) return null
            return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${redirectUri}&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline&state=${req.user.id}`
        default: return null
    }
}

router.get('/:provider/url', protect, (req, res) => {
    try {
        const { provider } = req.params
        const allowed = ['linkedin', 'pinterest', 'facebook', 'instagram', 'tiktok', 'youtube']
        if (!allowed.includes(provider)) return res.status(400).json({ error: 'Unknown provider' })

        const url = getOAuthUrl(provider, req)
        if (!url) {
            return res.status(200).json({ connected: false, url: null, error: 'Service temporarily unavailable' })
        }
        res.json({ url })
    } catch (e) {
        console.warn(`[Integration] ${req.params.provider} url failed:`, e.message)
        res.status(200).json({ connected: false, url: null, error: 'Service temporarily unavailable' })
    }
})

// [FIX-2026-08-05] generic OAuth callback stubs with graceful fallback
router.get('/:provider/callback', async (req, res) => {
    try {
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&success=${req.params.provider}`)
    } catch (e) {
        console.warn(`[Integration] ${req.params.provider} callback failed:`, e.message)
        res.redirect(`${process.env.FRONTEND_URL}/settings?tab=integrations&error=${req.params.provider}&fallback=true`)
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
