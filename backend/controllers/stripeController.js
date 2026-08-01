import {
  isStripeEnabled,
  getStripeStatus,
  createPaymentIntent,
  createStripeSubscription,
  createCheckoutSession,
  constructWebhookEvent,
  handleStripeWebhook,
} from '../services/stripeService.js';
import { Subscription, Invoice } from '../models/index.js';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const status = async (req, res) => {
  return res.json({ success: true, ...getStripeStatus() });
};

export const createCheckout = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (!isStripeEnabled()) {
      return res.json({ success: true, disabled: true, message: getStripeStatus().reason });
    }

    const { plan, interval, currency = 'USD' } = req.body || {};
    const priceId = process.env[`STRIPE_PRICE_${plan?.toUpperCase()}_${interval?.toUpperCase()}`];

    if (!priceId) {
      return res.status(400).json({
        success: false,
        disabled: true,
        message: `Цена для тарифа ${plan}/${interval} не настроена в Stripe.`,
      });
    }

    const appUrl = process.env.FRONTEND_URL || 'https://ai-viral-studio.pages.dev';
    const result = await createCheckoutSession({
      customerEmail: req.user?.email,
      priceId,
      successUrl: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/settings`,
      metadata: { userId: userId.toString(), plan, interval, currency },
    });

    return res.json(result);
  } catch (err) {
    console.error('[stripeController:createCheckout]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createSubscriptionIntent = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (!isStripeEnabled()) {
      return res.json({ success: true, disabled: true, message: getStripeStatus().reason });
    }

    const { plan, interval, currency = 'USD' } = req.body || {};
    const priceId = process.env[`STRIPE_PRICE_${plan?.toUpperCase()}_${interval?.toUpperCase()}`];

    if (!priceId) {
      return res.status(400).json({
        success: false,
        disabled: true,
        message: `Цена для тарифа ${plan}/${interval} не настроена в Stripe. Ручной счёт доступен через ЮKassa или менеджера.`,
      });
    }

    const result = await createStripeSubscription({
      customerEmail: req.user?.email,
      priceId,
      metadata: { userId: userId.toString(), plan, interval, currency },
    });

    return res.json(result);
  } catch (err) {
    console.error('[stripeController:createSubscriptionIntent]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createInvoicePayment = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (!isStripeEnabled()) {
      return res.json({ success: true, disabled: true, message: getStripeStatus().reason });
    }

    const { invoiceId } = req.params;
    const invoice = await Invoice.findOne({ _id: invoiceId, ownerId: userId }).lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const result = await createPaymentIntent({
      amount: invoice.amount,
      currency: invoice.currency || 'usd',
      description: invoice.description || `Invoice ${invoice._id}`,
      metadata: { invoiceId: invoice._id.toString(), userId: userId.toString() },
    });

    return res.json(result);
  } catch (err) {
    console.error('[stripeController:createInvoicePayment]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const webhook = async (req, res) => {
  try {
    if (!isStripeEnabled()) {
      return res.status(503).json({ success: false, disabled: true, message: getStripeStatus().reason });
    }

    const sig = req.headers['stripe-signature'];
    const event = await constructWebhookEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    const result = await handleStripeWebhook(event);

    // Update records on successful payment
    if (result.action === 'subscription_paid' || result.action === 'mark_paid') {
      const metadata = result.object?.metadata || {};
      if (metadata.invoiceId) {
        await Invoice.findByIdAndUpdate(metadata.invoiceId, {
          $set: { status: 'paid', paidAt: new Date() },
        });
      }
      if (metadata.userId && metadata.plan) {
        await Subscription.findOneAndUpdate(
          { userId: metadata.userId, status: 'pending' },
          { $set: { status: 'active' } },
          { sort: { createdAt: -1 } }
        );
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[stripeController:webhook]', err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};
