import {
    isWhatsAppConfigured,
    getWhatsAppStatus,
    sendWhatsAppMessage,
    sendWhatsAppBroadcast,
    handleWhatsAppWebhook,
} from '../services/whatsappService.js'
import {
    isSlackConfigured,
    isDiscordConfigured,
    getSlackStatus,
    getDiscordStatus,
    sendSlackMessage,
    sendDiscordMessage,
} from '../services/slackService.js'
import { isNotionConfigured, getNotionStatus, createNotionPage } from '../services/notionService.js'
import { isClickUpConfigured, getClickUpStatus, createClickUpTask } from '../services/clickupService.js'
import { isTrelloConfigured, getTrelloStatus, createTrelloCard } from '../services/trelloService.js'
import { isShopifyConfigured, getShopifyStatus, getShopifyProducts } from '../services/shopifyService.js'
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, triggerWebhooks } from '../services/webhookService.js'

export async function getStatus(req, res) {
    res.json({
        status: 'success',
        data: {
            whatsapp: getWhatsAppStatus(),
            slack: getSlackStatus(),
            discord: getDiscordStatus(),
            notion: getNotionStatus(),
            clickup: getClickUpStatus(),
            trello: getTrelloStatus(),
            shopify: getShopifyStatus(),
        },
    })
}

export async function postWhatsApp(req, res) {
    try {
        const { phone, message, templateName } = req.body
        const result = await sendWhatsAppMessage({ phone, message, templateName })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postWhatsAppBroadcast(req, res) {
    try {
        const { users, message } = req.body
        const result = await sendWhatsAppBroadcast(users || [], message)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postSlack(req, res) {
    try {
        const { channel, text, blocks } = req.body
        const result = await sendSlackMessage({ channel, text, blocks })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postDiscord(req, res) {
    try {
        const { channelId, content, embeds } = req.body
        const result = await sendDiscordMessage({ channelId, content, embeds })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postNotion(req, res) {
    try {
        const { databaseId, title, content, tags } = req.body
        const result = await createNotionPage({ databaseId, title, content, tags })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postClickUp(req, res) {
    try {
        const { listId, name, description, dueDate, assignees } = req.body
        const result = await createClickUpTask({ listId, name, description, dueDate, assignees })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postTrello(req, res) {
    try {
        const { listId, name, desc } = req.body
        const result = await createTrelloCard({ listId, name, desc })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getShopify(req, res) {
    try {
        const result = await getShopifyProducts(req.query)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getWebhooks(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await listWebhooks(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postWebhook(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { name, url, events, secret } = req.body
        const data = await createWebhook({ userId, name, url, events, secret })
        res.status(201).json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function patchWebhook(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await updateWebhook({ userId, webhookId: req.params.id, updates: req.body })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function deleteWebhookById(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        await deleteWebhook({ userId, webhookId: req.params.id })
        res.json({ status: 'success', deleted: true })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postWebhookTrigger(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { event, payload } = req.body
        const data = await triggerWebhooks({ userId, event: event || 'manual', payload: payload || {} })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default {
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
}
