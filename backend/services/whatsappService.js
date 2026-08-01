export const isWhatsAppConfigured = () => {
    return !!process.env.WHATSAPP_API_KEY && !!process.env.WHATSAPP_PHONE_NUMBER_ID
}

export function getWhatsAppStatus() {
    return {
        provider: 'Meta for Developers',
        status: isWhatsAppConfigured() ? 'configured' : 'not_configured',
        message: isWhatsAppConfigured()
            ? 'WhatsApp Business API активен'
            : 'Подключите WhatsApp Business API: создайте приложение в Meta for Developers, получите Access Token и Phone Number ID.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function sendWhatsAppMessage({ phone, message, templateName }) {
    if (!isWhatsAppConfigured()) {
        return { success: false, ...getWhatsAppStatus() }
    }
    try {
        const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
        const body = templateName
            ? {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'template',
                template: { name: templateName, language: { code: 'ru' } },
            }
            : {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: { body: message },
            }
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'WhatsApp API error')
        return { success: true, data }
    } catch (err) {
        console.error('[whatsappService:sendMessage]', err.message)
        return { success: false, error: err.message }
    }
}

export async function sendWhatsAppBroadcast(users, message) {
    if (!isWhatsAppConfigured()) return { success: false, ...getWhatsAppStatus() }
    const results = []
    for (const user of users.slice(0, 100)) { // rate limit batch
        const result = await sendWhatsAppMessage({ phone: user.phone, message })
        results.push({ phone: user.phone, ...result })
    }
    return { success: true, sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results }
}

export function handleWhatsAppWebhook(body) {
    // Meta webhook verification
    if (body?.object === 'whatsapp_business_account') {
        const entries = body.entry || []
        for (const entry of entries) {
            for (const change of entry.changes || []) {
                const value = change.value
                if (value?.messages) {
                    return { success: true, type: 'incoming', messages: value.messages }
                }
                if (value?.statuses) {
                    return { success: true, type: 'status', statuses: value.statuses }
                }
            }
        }
    }
    return { success: true, type: 'unknown', body }
}

export default { isWhatsAppConfigured, getWhatsAppStatus, sendWhatsAppMessage, sendWhatsAppBroadcast, handleWhatsAppWebhook }
