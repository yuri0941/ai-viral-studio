let stripe = null
try {
  if (process.env.STRIPE_ENABLED === 'true' && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  } else {
    console.log('💳 Stripe disabled')
  }
} catch (e) {
  console.log('💳 Stripe init skipped')
}

export default stripe
