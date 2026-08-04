import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export const createStripeSession = async ({ planId, userId, email, currency = 'usd' }) => {
    if (!stripe) throw new Error('Stripe not configured')

    const prices = { creator: 2900, pro: 7900, agency: 19900 }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency,
                product_data: { name: `AI Viral Studio — ${planId}` },
                unit_amount: prices[planId]
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
