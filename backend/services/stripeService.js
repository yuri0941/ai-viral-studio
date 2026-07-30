// Stripe integration is prepared but DISABLED by default.
// Set STRIPE_ENABLED=true and STRIPE_SECRET_KEY=sk_... in backend/.env to enable.
// When you open an entity abroad (LLC/Inc.), just flip the flag — no code changes needed.

export const isStripeEnabled = () => {
  return process.env.STRIPE_ENABLED === 'true' && !!process.env.STRIPE_SECRET_KEY;
};

export function getStripeStatus() {
  return {
    enabled: isStripeEnabled(),
    reason: isStripeEnabled()
      ? 'Stripe активен'
      : 'Международная оплата Stripe временно отключена. Свяжитесь для ручного счёта или включите в .env.',
  };
}

export async function createPaymentIntent({ amount, currency = 'usd', metadata = {}, description }) {
  if (!isStripeEnabled()) {
    return {
      success: false,
      disabled: true,
      message: getStripeStatus().reason,
    };
  }

  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default || stripeModule;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata,
      description,
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (err) {
    console.error('[stripeService:createPaymentIntent]', err.message);
    return { success: false, error: err.message };
  }
}

export async function createStripeSubscription({ customerEmail, priceId, metadata = {} }) {
  if (!isStripeEnabled()) {
    return {
      success: false,
      disabled: true,
      message: getStripeStatus().reason,
    };
  }

  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default || stripeModule;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const customer = await stripe.customers.create({
      email: customerEmail,
      metadata,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      status: subscription.status,
    };
  } catch (err) {
    console.error('[stripeService:createStripeSubscription]', err.message);
    return { success: false, error: err.message };
  }
}

export async function constructWebhookEvent(payload, signature, secret) {
  if (!isStripeEnabled()) {
    return { success: false, disabled: true, message: getStripeStatus().reason };
  }

  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default || stripeModule;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('[stripeService:constructWebhookEvent]', err.message);
    throw err;
  }
}

export async function handleStripeWebhook(event) {
  if (!isStripeEnabled()) {
    return { success: false, disabled: true };
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      return { success: true, action: 'mark_paid', object: event.data.object };
    case 'payment_intent.payment_failed':
      return { success: true, action: 'mark_failed', object: event.data.object };
    case 'invoice.payment_succeeded':
      return { success: true, action: 'subscription_paid', object: event.data.object };
    case 'customer.subscription.deleted':
      return { success: true, action: 'subscription_canceled', object: event.data.object };
    default:
      return { success: true, action: 'ignore', type: event.type };
  }
}
