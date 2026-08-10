import { DeveloperApiKey, generateApiKey } from '../models/index.js'
import { chatWithAI, extractText, generateContent, getProviderStatuses } from '../services/aiService.js'
import crypto from 'crypto'

export async function validateApiKey(req, res, next) {
    const key = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-api-key']
    if (!key) return res.status(401).json({ status: 'error', message: 'API key required' })

    try {
        const doc = await DeveloperApiKey.findOne({ key, isActive: true }).lean()
        if (!doc) return res.status(401).json({ status: 'error', message: 'Invalid API key' })
        if (!doc.approved) return res.status(403).json({ status: 'error', message: 'API key pending approval' })

        req.apiKey = doc
        next()
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function rateLimitApiKey(req, res, next) {
    const doc = req.apiKey
    const windowStart = new Date(Date.now() - 60 * 60 * 1000)
    if (!doc.lastUsedAt || doc.lastUsedAt < windowStart) {
        req.apiKey.usage = 0
    }
    if (doc.usage >= doc.rateLimit) {
        return res.status(429).json({ status: 'error', message: 'Rate limit exceeded', retryAfter: 3600 })
    }
    next()
}

export async function incrementUsage(keyId) {
    await DeveloperApiKey.findByIdAndUpdate(keyId, {
        $inc: { usage: 1, monthlyUsage: 1 },
        lastUsedAt: new Date(),
    })
}

export async function getStatus(req, res) {
    try {
        const statuses = await getProviderStatuses()
        res.json({
            status: 'success',
            data: {
                version: '1.0.0',
                providers: statuses,
                usage: {
                    used: req.apiKey.usage,
                    limit: req.apiKey.rateLimit,
                    monthly: req.apiKey.monthlyUsage,
                    billingRate: req.apiKey.billingRate,
                },
            },
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postChat(req, res) {
    try {
        const { message, history = [], lang = 'ru', context = {} } = req.body
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ status: 'error', message: 'message is required' })
        }
        const reply = extractText(await chatWithAI(message, history, lang))
        await incrementUsage(req.apiKey._id)
        res.json({ status: 'success', data: { reply, context } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function postGenerate(req, res) {
    try {
        const { type = 'text', params = {}, lang = 'ru' } = req.body
        let result = null
        if (type === 'image') {
            const { prompt, style, size } = params
            const { generateImage } = await import('../services/aiService.js')
            result = await generateImage(prompt, { style, size })
        } else {
            result = await generateContent(type, params)
        }
        await incrementUsage(req.apiKey._id)
        res.json({ status: 'success', data: { type, result } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listMyKeys(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const keys = await DeveloperApiKey.find({ userId }).sort({ createdAt: -1 }).lean()
        res.json({ status: 'success', data: keys })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createKey(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { name, rateLimit, billingRate } = req.body
        if (!name) return res.status(400).json({ status: 'error', message: 'name is required' })
        const key = await DeveloperApiKey.create({
            userId,
            name,
            key: generateApiKey(),
            rateLimit: rateLimit || 1000,
            billingRate: billingRate || 0.01,
            approved: false,
        })
        res.status(201).json({ status: 'success', data: key })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function updateKey(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { name, rateLimit, billingRate, isActive, approved } = req.body
        const update = {}
        if (name !== undefined) update.name = name
        if (rateLimit !== undefined) update.rateLimit = rateLimit
        if (billingRate !== undefined) update.billingRate = billingRate
        if (isActive !== undefined) update.isActive = isActive
        if (approved !== undefined && (req.user.role === 'owner' || req.user.role === 'admin')) update.approved = approved

        const key = await DeveloperApiKey.findOneAndUpdate({ _id: req.params.id, userId }, update, { new: true }).lean()
        if (!key) return res.status(404).json({ status: 'error', message: 'Key not found' })
        res.json({ status: 'success', data: key })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function deleteKey(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const key = await DeveloperApiKey.findOneAndDelete({ _id: req.params.id, userId }).lean()
        if (!key) return res.status(404).json({ status: 'error', message: 'Key not found' })
        res.json({ status: 'success', data: { deleted: true } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function addWebhook(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { url, events, secret } = req.body
        if (!url) return res.status(400).json({ status: 'error', message: 'url is required' })
        const key = await DeveloperApiKey.findOneAndUpdate(
            { _id: req.params.id, userId },
            { $push: { webhooks: { url, events: events || ['*'], secret: secret || crypto.randomBytes(16).toString('hex'), active: true } } },
            { new: true }
        ).lean()
        if (!key) return res.status(404).json({ status: 'error', message: 'Key not found' })
        res.json({ status: 'success', data: key })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function removeWebhook(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const key = await DeveloperApiKey.findOneAndUpdate(
            { _id: req.params.id, userId },
            { $pull: { webhooks: { _id: req.params.webhookId } } },
            { new: true }
        ).lean()
        if (!key) return res.status(404).json({ status: 'error', message: 'Key not found' })
        res.json({ status: 'success', data: key })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export function getDocs(req, res) {
    res.json({
        status: 'success',
        data: {
            openapi: '3.0.0',
            info: {
                title: 'AI Viral Studio — OMEGA API',
                version: '1.0.0',
                description: 'B2B2B API for OMEGA chat, content generation, and status.',
            },
            servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'https://api.ai-viral-studio.ru' }],
            security: [{ bearerAuth: [] }],
            paths: {
                '/api/v1/omega/status': {
                    get: {
                        summary: 'Get API status and provider health',
                        security: [{ bearerAuth: [] }],
                        responses: { '200': { description: 'Status object' } },
                    },
                },
                '/api/v1/omega/chat': {
                    post: {
                        summary: 'Chat with OMEGA',
                        security: [{ bearerAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' },
                                            history: { type: 'array' },
                                            lang: { type: 'string' },
                                        },
                                        required: ['message'],
                                    },
                                },
                            },
                        },
                        responses: { '200': { description: 'AI reply' } },
                    },
                },
                '/api/v1/omega/generate': {
                    post: {
                        summary: 'Generate content or image',
                        security: [{ bearerAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string', enum: ['text', 'image'] },
                                            params: { type: 'object' },
                                            lang: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { '200': { description: 'Generated content' } },
                    },
                },
            },
            components: {
                securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer' },
                },
            },
        },
    })
}

export default {
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
}
