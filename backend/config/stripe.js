import Stripe from 'stripe'

let stripeInstance = null

export const getStripe = () => {
  if (stripeInstance) return stripeInstance
  if (process.env.STRIPE_ENABLED !== 'true' || !process.env.STRIPE_SECRET_KEY) {
    return null
  }
  try {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    return stripeInstance
  } catch (e) {
    console.error('💳 Stripe init failed:', e.message)
    return null
  }
}

export const isStripeEnabled = () => process.env.STRIPE_ENABLED === 'true' && !!process.env.STRIPE_SECRET_KEY

export default { getStripe, isStripeEnabled }
