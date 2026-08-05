// [v5.9] added: real PayPal order creation/capture via PayPal REST API
const PAYPAL_BASE = {
    sandbox: 'https://api-m.sandbox.paypal.com',
    live: 'https://api-m.paypal.com',
}

const getPayPalBase = () => PAYPAL_BASE[process.env.PAYPAL_MODE] || PAYPAL_BASE.sandbox

const getAccessToken = async () => {
    const { PAYPAL_CLIENT_ID: clientId, PAYPAL_CLIENT_SECRET: secret } = process.env
    if (!clientId || !secret) throw new Error('PayPal credentials not configured')
    const res = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description || data.error || 'PayPal token error')
    return data.access_token
}

export const createPayPalOrder = async ({ planId, amount, currency = 'USD', description, customId, returnUrl, cancelUrl }) => {
    const accessToken = await getAccessToken()
    const res = await fetch(`${getPayPalBase()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: { currency_code: currency, value: String(amount) },
                description: description || `AI Viral Studio — ${planId}`,
                custom_id: customId,
                reference_id: planId,
            }],
            application_context: {
                brand_name: 'AI Viral Studio',
                landing_page: 'LOGIN',
                user_action: 'PAY_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl,
            },
        }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || 'PayPal order creation failed')
    const approvalUrl = data.links?.find(l => l.rel === 'approve')?.href
    return { orderId: data.id, approvalUrl, provider: 'paypal' }
}

export const capturePayPalOrder = async (orderId) => {
    const accessToken = await getAccessToken()
    const res = await fetch(`${getPayPalBase()}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || 'PayPal capture failed')
    return { id: data.id, status: data.status, provider: 'paypal' }
}

export const getPayPalStatus = () => {
    return { connected: !!process.env.PAYPAL_CLIENT_ID, mode: process.env.PAYPAL_MODE || 'sandbox' }
}
