import { getStripe, isStripeEnabled as checkStripeEnabled } from '../config/stripe.js'

// [MASTER-v5.6] added: status helpers
export const isStripeEnabled = () => checkStripeEnabled()
export const getStripeStatus = () => ({
    enabled: checkStripeEnabled(),
    reason: getStripe() ? 'active' : 'STRIPE_SECRET_KEY not configured or STRIPE_ENABLED != true'
})

export const createPaymentIntent = async ({ amount, currency, description, metadata }) => {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe not configured')
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        description,
        metadata
    })
    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }
}

export const createCheckoutSession = async ({ customerEmail, priceId, successUrl, cancelUrl, metadata }) => {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe not configured')
    const session = await stripe.checkout.sessions.create({
        customer_email: customerEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
    })
    return { url: session.url, sessionId: session.id }
}

export const createStripeSubscription = async ({ customerEmail, priceId, metadata }) => {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe not configured')
    const customer = await stripe.customers.create({ email: customerEmail })
    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
    })
    return { subscriptionId: subscription.id, clientSecret: subscription.latest_invoice?.payment_intent?.client_secret }
}

export const handleStripeWebhook = async (event) => {
    const object = event.data?.object || {}
    if (event.type === 'checkout.session.completed') {
        return { action: 'subscription_paid', object }
    }
    if (event.type === 'invoice.payment_succeeded') {
        return { action: 'mark_paid', object }
    }
    return { action: 'ignored', object }
}

export const createStripeSession = async ({ planId, userId, email, currency = 'usd' }) => {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe not configured')

    // [PLANCONFIG-ADMIN] цены — из PlanConfig (БД) через кэш (алиасы creator→pro и т.д.),
    // а не in-memory legacy-таблица 2900/7900/19900. Stripe выключен по умолчанию; если включат — цены реальные.
    const { getPlanSync } = await import('./planConfigCache.js')
    const planDoc = getPlanSync(planId)
    const unitAmount = planDoc.price
    if (!(unitAmount > 0)) throw new Error(`Unknown or free plan: ${planId}`)

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency,
                product_data: { name: `AI Viral Studio — ${planDoc.plan}` },
                unit_amount: unitAmount
            },
            quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/payment-success?plan=${planId}&provider=stripe`,
        cancel_url: `${process.env.FRONTEND_URL}/settings?tab=subscriptions`,
        metadata: { userId, planId }
    })

    return { url: session.url, sessionId: session.id, provider: 'stripe' }
}

// [PAYMENT-v5.2] added
// [MASTER-v5.6] Stripe webhook helper
export const constructWebhookEvent = (payload, signature, secret) => {
    if (!secret) {
        console.warn('[Stripe] Webhook secret not configured, using mock')
        return { type: 'checkout.session.completed', data: { object: {} } }
    }
    try {
        const stripe = getStripe()
        if (stripe) return stripe.webhooks.constructEvent(payload, signature, secret)
        return { type: 'checkout.session.completed', data: { object: {} } }
    } catch (err) {
        console.error('[Stripe] Webhook verification failed:', err.message)
        throw err
    }
}
