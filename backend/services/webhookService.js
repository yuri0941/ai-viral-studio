import { Webhook } from '../models/index.js'
import crypto from 'crypto'

export async function listWebhooks(userId) {
    return Webhook.find({ userId }).sort({ createdAt: -1 }).lean()
}

export async function createWebhook({ userId, name, url, events, secret }) {
    return Webhook.create({ userId, name, url, events: events || ['*'], secret: secret || crypto.randomBytes(16).toString('hex') })
}

export async function updateWebhook({ userId, webhookId, updates }) {
    return Webhook.findOneAndUpdate({ _id: webhookId, userId }, { $set: updates }, { new: true })
}

export async function deleteWebhook({ userId, webhookId }) {
    return Webhook.findOneAndDelete({ _id: webhookId, userId })
}

export function signWebhookPayload(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    return hmac.digest('hex')
}

export async function triggerWebhooks({ userId, event, payload }) {
    const webhooks = await Webhook.find({ userId, isActive: true }).lean()
    const results = []
    for (const webhook of webhooks) {
        if (!webhook.events.includes('*') && !webhook.events.includes(event)) continue
        const fullPayload = { event, timestamp: new Date().toISOString(), data: payload }
        const signature = signWebhookPayload(fullPayload, webhook.secret)
        try {
            const res = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event,
                },
                body: JSON.stringify(fullPayload),
            })
            await Webhook.findByIdAndUpdate(webhook._id, { lastStatus: res.status, lastCalledAt: new Date(), lastError: '' })
            results.push({ webhookId: webhook._id, status: res.status, success: res.ok })
        } catch (err) {
            await Webhook.findByIdAndUpdate(webhook._id, { lastStatus: 0, lastCalledAt: new Date(), lastError: err.message })
            results.push({ webhookId: webhook._id, status: 0, success: false, error: err.message })
        }
    }
    return results
}

export default { listWebhooks, createWebhook, updateWebhook, deleteWebhook, signWebhookPayload, triggerWebhooks }
