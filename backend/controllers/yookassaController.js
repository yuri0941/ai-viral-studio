import { createPayment, checkPayment, handleWebhook, createInvoicePayment } from '../services/yookassaService.js';
import { Subscription, Invoice } from '../models/index.js';

const RETURN_URL = process.env.YOOKASSA_RETURN_URL || 'http://localhost:3000/dashboard/finance';

export const createSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { plan, interval, currency = 'RUB' } = req.body || {};
    const planId = plan || 'creator';
    const isYearly = interval === 'year';

    // Plan prices in RUB
    const prices = {
      free: 0,
      starter: 790,
      creator: 990,
      pro: 4290,
      agency: 14290,
      enterprise: 47500,
    };

    const basePrice = prices[planId] || prices.creator;
    let amount = basePrice;
    if (isYearly) {
      amount = Math.round(basePrice * 12 * 0.8); // -20% discount
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Бесплатный тариф не требует оплаты' });
    }

    // Create or update pending subscription
    const now = new Date();
    const endDate = new Date(now);
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    await Subscription.updateMany(
      { userId, status: { $in: ['active', 'trialing'] } },
      { $set: { status: 'inactive' } }
    );

    const subscription = await Subscription.create({
      userId,
      plan: planId,
      status: 'pending',
      price: amount,
      currency: currency.toUpperCase(),
      interval: isYearly ? 'year' : 'month',
      startDate: now,
      endDate,
      autoRenew: true,
      paymentMethod: 'card',
      provider: 'yookassa',
    });

    // Create draft invoice
    const invoice = await Invoice.create({
      ownerId: userId,
      subscriptionId: subscription._id,
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      type: 'subscription',
      description: `Подписка ${planId} (${isYearly ? 'год' : 'месяц'})`,
      items: [
        {
          name: `Подписка ${planId}`,
          description: isYearly ? 'Годовая подписка со скидкой 20%' : 'Ежемесячная подписка',
          quantity: 1,
          price: amount,
        },
      ],
      provider: 'yookassa',
    });

    // Create YooKassa payment
    const payment = await createPayment({
      amount,
      currency,
      description: `Подписка ${planId}`,
      returnUrl: `${RETURN_URL}?subscription=${subscription._id}`,
      metadata: {
        userId: userId.toString(),
        subscriptionId: subscription._id.toString(),
        invoiceId: invoice._id.toString(),
        plan: planId,
        interval: isYearly ? 'year' : 'month',
      },
    });

    // Update subscription and invoice with provider payment id
    await Promise.all([
      Subscription.findByIdAndUpdate(subscription._id, {
        $set: { providerPaymentId: payment.paymentId },
      }),
      Invoice.findByIdAndUpdate(invoice._id, {
        $set: { providerPaymentId: payment.paymentId, paymentUrl: payment.confirmationUrl },
      }),
    ]);

    return res.json({
      success: true,
      paymentUrl: payment.confirmationUrl,
      paymentId: payment.paymentId,
      subscriptionId: subscription._id,
      invoiceId: invoice._id,
      amount,
      currency,
    });
  } catch (err) {
    console.error('[yookassaController:createSubscriptionPayment]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createInvoicePaymentLink = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { invoiceId } = req.params;
    const invoice = await Invoice.findOne({ _id: invoiceId, ownerId: userId }).lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, error: 'Invoice already paid' });

    const payment = await createInvoicePayment({
      invoiceId: invoice._id,
      amount: invoice.amount,
      description: invoice.description || `Счёт ${invoice.invoiceNumber || invoice._id}`,
      returnUrl: `${RETURN_URL}?invoice=${invoice._id}`,
      metadata: {
        userId: userId.toString(),
        invoiceId: invoice._id.toString(),
      },
    });

    await Invoice.findByIdAndUpdate(invoice._id, {
      $set: { providerPaymentId: payment.paymentId, paymentUrl: payment.confirmationUrl, status: 'pending' },
    });

    return res.json({
      success: true,
      paymentUrl: payment.confirmationUrl,
      paymentId: payment.paymentId,
      invoiceId: invoice._id,
    });
  } catch (err) {
    console.error('[yookassaController:createInvoicePaymentLink]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const checkPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { paymentId } = req.params;
    const payment = await checkPayment(paymentId);

    return res.json({ success: true, payment });
  } catch (err) {
    console.error('[yookassaController:checkPaymentStatus]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const yookassaWebhook = async (req, res) => {
  try {
    const result = handleWebhook(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const { paymentId, action, metadata } = result;

    if (action === 'mark_paid') {
      // Update invoice
      if (metadata?.invoiceId) {
        await Invoice.findByIdAndUpdate(metadata.invoiceId, {
          $set: { status: 'paid', providerPaymentId: paymentId, paidAt: new Date() },
        });
      }

      // Update subscription
      if (metadata?.subscriptionId) {
        await Subscription.findByIdAndUpdate(metadata.subscriptionId, {
          $set: { status: 'active', providerPaymentId: paymentId },
        });
      } else if (metadata?.invoiceId) {
        const invoice = await Invoice.findById(metadata.invoiceId).lean();
        if (invoice?.subscriptionId) {
          await Subscription.findByIdAndUpdate(invoice.subscriptionId, {
            $set: { status: 'active', providerPaymentId: paymentId },
          });
        }
      }
    } else if (action === 'mark_canceled') {
      if (metadata?.invoiceId) {
        await Invoice.findByIdAndUpdate(metadata.invoiceId, {
          $set: { status: 'canceled' },
        });
      }
      if (metadata?.subscriptionId) {
        await Subscription.findByIdAndUpdate(metadata.subscriptionId, {
          $set: { status: 'canceled', autoRenew: false },
        });
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[yookassaController:yookassaWebhook]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
