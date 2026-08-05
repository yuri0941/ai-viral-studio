import Stripe from 'stripe'

let stripe = null

if (process.env.STRIPE_ENABLED !== 'true') {
  console.log('💳 Stripe disabled')
} else if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  console.log('💳 Stripe initialized')
} else {
  console.warn('⚠️ Stripe enabled but no valid key found')
}

export default stripe
