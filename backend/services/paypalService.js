export const isPayPalEnabled = () => {
    return !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
}

function getBaseUrl() {
    return process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'
}

async function getAccessToken() {
    const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description || 'PayPal auth failed')
    return data.access_token
}

export async function createPayPalOrder({ amount, currency = 'USD', description, returnUrl, cancelUrl, customId }) {
    if (!isPayPalEnabled()) {
        return { success: false, disabled: true, message: 'PayPal not configured' }
    }
    try {
        const accessToken = await getAccessToken()
        const res = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: { currency_code: currency.toUpperCase(), value: String(amount) },
                    description,
                    custom_id: customId,
                }],
                application_context: {
                    return_url: returnUrl,
                    cancel_url: cancelUrl,
                },
            }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'PayPal order creation failed')
        return { success: true, orderId: data.id, approvalUrl: data.links.find(l => l.rel === 'approve')?.href }
    } catch (err) {
        console.error('[paypalService:createOrder]', err.message)
        return { success: false, error: err.message }
    }
}

export async function capturePayPalOrder(orderId) {
    if (!isPayPalEnabled()) return { success: false, disabled: true }
    try {
        const accessToken = await getAccessToken()
        const res = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'PayPal capture failed')
        return { success: true, data }
    } catch (err) {
        console.error('[paypalService:captureOrder]', err.message)
        return { success: false, error: err.message }
    }
}

export function getPayPalStatus() {
    return {
        enabled: isPayPalEnabled(),
        reason: isPayPalEnabled() ? 'PayPal active' : 'PayPal not configured',
    }
}

export default { isPayPalEnabled, createPayPalOrder, capturePayPalOrder, getPayPalStatus }
