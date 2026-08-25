import { createPayment, checkPayment, handleWebhook, createInvoicePayment, getReceiptsByPayment } from '../services/yookassaService.js';
import { Subscription, Invoice, User } from '../models/index.js';
import Payment from '../models/Payment.js';
import { sendPaymentSuccessEmail, sendReceiptFailedEmail, sendSubscriptionActiveEmail } from '../services/emailService.js';
import PlanConfig from '../models/PlanConfig.js';

// [v9.9.19.14] return_url — строго HTTPS, собирается из FRONTEND_URL + '/payment/success'
const RETURN_URL = (process.env.FRONTEND_URL || 'https://aiviral-studio.ru').replace(/\/$/, '');

// [19.13-lite-PAYMENTS-NPD] 54-ФЗ receipt builder (НПД: без НДС, услуга, полная оплата)
function buildReceipt({ email, amount, planId, isYearly, isFounding, foundingDiscountPercent = 30 }) {
  const planLabel = planId === 'agency' ? 'Agency' : 'Pro';
  let itemDescription = `Подписка AI Viral Studio ${planLabel}, 1 мес`;
  if (isYearly) itemDescription = `Подписка AI Viral Studio ${planLabel}, 1 год`;
  if (isFounding) itemDescription += ` — скидка основателя ${foundingDiscountPercent}%`;
  return {
    customer: { email },
    items: [{
      description: itemDescription,
      quantity: '1.00',
      amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
      vat_code: 1,
      payment_mode: 'full_payment',
      payment_subject: 'service',
    }],
  };
}

// [19.13-lite-PAYMENTS-NPD] после успешной оплаты: фиксируем платёжную запись + статус чека.
// Ошибка фискализации НИКОГДА не валит платёж.
async function recordPaymentAndReceipt({ paymentId, metadata, result }) {
  const userId = metadata?.userId;
  if (!userId || !paymentId) return;
  const user = await User.findById(userId).lean();
  const subscription = metadata?.subscriptionId
    ? await Subscription.findById(metadata.subscriptionId).lean()
    : null;
  const invoice = metadata?.invoiceId
    ? await Invoice.findById(metadata.invoiceId).lean()
    : null;
  const amount = subscription?.price ?? invoice?.amount ?? 0;

  const paymentDoc = await Payment.findOneAndUpdate(
    { yookassaPaymentId: paymentId },
    {
      $set: {
        userId,
        planId: subscription?.plan || metadata?.plan || '',
        amount,
        currency: 'RUB',
        status: 'succeeded',
        paidAt: new Date(),
        customerEmail: user?.email || '',
        description: result?.description || `Подписка ${subscription?.plan || metadata?.plan || ''}`,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // [CLIENT-JOURNEY-QA] реферальное начисление за первую оплату ($4 рефереру).
  // markReferralPaid был написан, но нигде не вызывался. Best-effort: на платёж не влияет.
  try {
    const { markReferralPaid } = await import('../services/referralService.js')
    await markReferralPaid(userId)
  } catch { /* рефералка не должна валить платёж */ }

  if (String(process.env.YOOKASSA_RECEIPTS || '').toLowerCase() !== 'true') return;

  try {
    const receipts = await getReceiptsByPayment(paymentId);
    const sale = receipts.find(r => r.type === 'payment') || receipts[0];
    if (sale && sale.status === 'succeeded') {
      paymentDoc.receiptId = sale.id;
      paymentDoc.receiptStatus = 'registered';
      await paymentDoc.save();
    } else {
      // Чек может формироваться до 5 минут — повторный запрос с задержкой
      setTimeout(async () => {
        try {
          const again = await getReceiptsByPayment(paymentId);
          const r2 = again.find(r => r.type === 'payment') || again[0];
          if (r2 && r2.status === 'succeeded') {
            await Payment.updateOne({ yookassaPaymentId: paymentId }, { $set: { receiptId: r2.id, receiptStatus: 'registered' } });
          } else {
            await markReceiptFailed(paymentId, 'receipt_not_found_after_retry', user);
          }
        } catch (e) {
          await markReceiptFailed(paymentId, e.message, user);
        }
      }, 5 * 60 * 1000);
    }
  } catch (err) {
    await markReceiptFailed(paymentId, err.message, user);
  }
}

async function markReceiptFailed(paymentId, reason, user) {
  await Payment.updateOne(
    { yookassaPaymentId: paymentId },
    { $set: { receiptStatus: 'failed', receiptError: String(reason || '').slice(0, 200) } }
  );
  try {
    const { alertOwner } = await import('../services/ownerBot.js');
    alertOwner?.(`🧾 Чек НЕ сформирован для платежа ${paymentId}\nКлиент: ${user?.email || '—'}\nПричина: ${String(reason || '').slice(0, 160)}`, 'payment');
  } catch { /* alert best-effort */ }
  if (user?.email) {
    sendReceiptFailedEmail(user.email, user.name).catch(() => {});
  }
}

export const createSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // [v9.9.19.14] 3.1 ключи проверяются ДО вызова API — никогда не 500 на «нет ключей»
    const { getProviderKey } = await import('../services/aiService.js');
    const shopId = await getProviderKey('yookassa_shop_id');
    const secret = await getProviderKey('yookassa_secret');
    if (!shopId || !secret) {
      return res.status(400).json({ success: false, error: 'ЮKassa не настроена. Кабинет → API Ключи → yookassa' });
    }

    const { plan, interval, currency = 'RUB' } = req.body || {};
    const planId = plan || 'creator';
    const isYearly = interval === 'year';

    // [25-TARIFF-GATES] price is read from PlanConfig (DB) — hot-editable by owner
    const planConfig = await PlanConfig.getPlan(planId);
    const basePrice = planConfig.price;
    let amount = basePrice;
    if (isYearly) {
      amount = Math.round(basePrice * 12 * 0.8); // -20% discount
    }

    // [19.13-lite-PAYMENTS-NPD] founding member скидка от текущей цены тарифа
    // [P1.6-PREP] скидка действует, пока есть свободные founding-слоты (авто-выкл без деплоя)
    // [PLANCONFIG-ADMIN] процент скидки — из FoundingConfig (БД, hot-reload), фолбэк 30%
    const payer = await User.findById(userId).lean();
    const { isFoundingDiscountEligible, getFoundingConfig } = await import('../services/foundingService.js');
    const isFounding = await isFoundingDiscountEligible(payer);
    let foundingDiscountPercent = 30;
    if (isFounding) {
      const { discountPercent } = await getFoundingConfig();
      foundingDiscountPercent = discountPercent;
      amount = Math.round(amount * (1 - discountPercent / 100));
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
      amount,
      currency: currency.toUpperCase(),
      interval: isYearly ? 'year' : 'month',
      startDate: now,
      endDate,
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      autoRenew: true,
      paymentMethod: 'card',
      provider: 'yookassa',
      // [PLANCONFIG-ADMIN] grandfathering: снапшот условий тарифа на момент покупки
      planSnapshot: { price: basePrice, quotas: planConfig.quotas || {}, features: planConfig.features || {} },
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

    // [19.13-lite-PAYMENTS-NPD] 54-ФЗ receipt (за рубильником YOOKASSA_RECEIPTS внутри createPayment)
    const receipt = payer?.email
      ? buildReceipt({ email: payer.email, amount, planId, isYearly, isFounding, foundingDiscountPercent })
      : null;

    // Create YooKassa payment
    const payment = await createPayment({
      amount,
      currency,
      description: receipt?.items?.[0]?.description || `Подписка ${planId}`,
      returnUrl: `${RETURN_URL}/payment/success?plan=${planId}&subscription=${subscription._id}`,
      receipt,
      metadata: {
        userId: userId.toString(),
        subscriptionId: subscription._id.toString(),
        invoiceId: invoice._id.toString(),
        plan: planId,
        interval: isYearly ? 'year' : 'month',
      },
    });

    // [19.13-lite-PAYMENTS-NPD] чек отклонён, но платёж создан без него — фиксируем для отчётности
    if (payment.receiptFailed) {
      await Payment.findOneAndUpdate(
        { yookassaPaymentId: payment.paymentId },
        { $set: { receiptStatus: 'failed', receiptError: String(payment.receiptError || '').slice(0, 200) } },
        { upsert: true }
      ).catch(() => {});
    }

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
    // [v9.9.19.14] 3.1 ошибка API ЮKassa → 502 JSON с деталями, НЕ 500
    console.error('[YOOKASSA]', err.message);
    const code = err.status >= 400 && err.status < 500 ? 400 : 502
    return res.status(code).json({ success: false, error: err.message || 'Платёж не создан', details: err.raw || err.message });
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
    // [v9.9.19.14] express.raw отдаёт Buffer — парсим; всегда отвечаем 200 после обработки (иначе ЮKassa ретраит)
    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      try { payload = JSON.parse(payload.toString('utf8')); } catch { payload = null; }
    }
    const result = handleWebhook(payload);
    if (!result.success) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const { paymentId, action, metadata } = result;
    console.log(`[YOOKASSA-WEBHOOK] payment=${paymentId} status=${result.status}`);

    if (action === 'mark_paid') {
      // [v9.9.19.14] идемпотентность: повторная доставка не создаёт дубль
      if (metadata?.invoiceId) {
        const existing = await Invoice.findById(metadata.invoiceId).lean();
        if (existing?.status === 'paid') {
          return res.status(200).json({ success: true, idempotent: true });
        }
      }
      if (metadata?.subscriptionId) {
        const existingSub = await Subscription.findById(metadata.subscriptionId).lean();
        if (existingSub?.status === 'active' && existingSub?.providerPaymentId === paymentId) {
          return res.status(200).json({ success: true, idempotent: true });
        }
      }

      // Update invoice
      if (metadata?.invoiceId) {
        await Invoice.findByIdAndUpdate(metadata.invoiceId, {
          $set: { status: 'paid', providerPaymentId: paymentId, paidAt: new Date() },
        });
      }

      // Update subscription + user plan
      let paidSub = null;
      let paidInvoice = null;
      if (metadata?.subscriptionId) {
        const sub = await Subscription.findById(metadata.subscriptionId).lean();
        const now = new Date();
        const periodStart = sub?.startDate || now;
        const periodEnd = sub?.endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await Subscription.findByIdAndUpdate(metadata.subscriptionId, {
          $set: {
            status: 'active',
            providerPaymentId: paymentId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            amount: sub?.price ?? sub?.amount ?? 0,
          },
        });
        paidSub = await Subscription.findById(metadata.subscriptionId).lean();
        if (paidSub?.userId && paidSub?.plan) {
          await User.findByIdAndUpdate(paidSub.userId, { $set: { subscription: paidSub.plan } }); // [PAYMENT-v5.2] обновляем пользовательский тариф
        }
      } else if (metadata?.invoiceId) {
        paidInvoice = await Invoice.findById(metadata.invoiceId).lean();
        if (paidInvoice?.subscriptionId) {
          const sub = await Subscription.findById(paidInvoice.subscriptionId).lean();
          const now = new Date();
          const periodStart = sub?.startDate || now;
          const periodEnd = sub?.endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await Subscription.findByIdAndUpdate(paidInvoice.subscriptionId, {
            $set: {
              status: 'active',
              providerPaymentId: paymentId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              amount: sub?.price ?? sub?.amount ?? 0,
            },
          });
        }
      }

      // [P1.6-PREP] founding-слот занимается первой успешной оплатой (идемпотентно, unique userId);
      // метрика слотов НЕ валит webhook
      let foundingResult = { counted: false };
      try {
        const { markFoundingSlotPaid } = await import('../services/foundingService.js');
        foundingResult = await markFoundingSlotPaid(metadata?.userId, paymentId);
      } catch (fErr) {
        console.warn('[founding] markFoundingSlotPaid failed:', fErr.message);
      }

      // [P1.5-METRICS] paid: идемпотентно по paymentId (guard в metricsService); метрика НЕ валит webhook
      try {
        const { trackPaid } = await import('../services/metricsService.js');
        await trackPaid({ paymentId, amountRub: paidSub?.price ?? paidSub?.amount ?? paidInvoice?.amount ?? 0 });
      } catch (mErr) {
        console.warn('[metrics] paid track failed:', mErr.message);
      }

      // [19.13-lite-PAYMENTS-NPD] фиксируем платёжную запись + статус чека (ошибки чека не валят webhook)
      recordPaymentAndReceipt({ paymentId, metadata, result }).catch((e) => {
        console.error('[yookassaController:webhook] recordPaymentAndReceipt failed:', e.message);
      });

      // [SUBSCRIPTION-CHECKOUT-FIX] TG-алерт владельцу об успешной оплате (не валит webhook)
      try {
        const { alertOwner } = await import('../services/ownerBot.js');
        const client = metadata?.userId ? await User.findById(metadata.userId).lean() : null;
        const plan = paidSub?.plan || metadata?.plan || '—';
        const amount = paidSub?.price ?? paidSub?.amount ?? paidInvoice?.amount ?? 0;
        const foundingLine = foundingResult?.counted
          ? `\n🎟 Founding-слот ${foundingResult.used}/${(foundingResult.used || 0) + (foundingResult.remaining || 0)}`
          : '';
        await alertOwner(
          `💰 Оплата: <b>${plan}</b>\n` +
          `Сумма: ${Number(amount).toLocaleString('ru-RU')} ₽\n` +
          `Клиент: ${client?.email || client?.name || '—'}\n` +
          `Платёж: <code>${paymentId}</code>${foundingLine}`,
          'payment'
        );
      } catch (alertErr) {
        console.warn('[yookassaController:webhook] owner alert failed:', alertErr.message);
      }

      // Send payment success email
      try {
        const userId = metadata?.userId;
        if (userId) {
          const user = await User.findById(userId);
          const plan = paidSub?.plan || metadata?.plan || '—';
          const amount = paidSub?.price ?? paidSub?.amount ?? paidInvoice?.amount ?? 0;
          if (user) {
            // [19.13-lite-PAYMENTS-NPD] новое письмо «подписка активна до <дата> + чек от ЮKassa»
            if (paidSub?.endDate) {
              await sendSubscriptionActiveEmail(user.email, user.name, plan, paidSub.endDate);
            } else {
              await sendPaymentSuccessEmail(user.email, user.name, plan, amount);
            }
          }
        }
      } catch (emailErr) {
        console.error('[yookassaController:webhook] payment success email failed:', emailErr.message);
      }
    } else if (action === 'mark_refunded') {
      // [19.13-lite-PAYMENTS-NPD] refund.succeeded: помечаем платёж возвращённым + TG-алерт владельцу
      let refundResult;
      try {
        refundResult = await Payment.updateOne(
          { yookassaPaymentId: paymentId },
          { $set: { status: 'refunded', refundedAt: new Date() } }
        );
      } catch { refundResult = { modifiedCount: 0 }; }

      if (metadata?.subscriptionId) {
        await Subscription.findByIdAndUpdate(metadata.subscriptionId, {
          $set: { status: 'refunded', autoRenew: false },
        }).catch(() => {});
      }

      if (refundResult?.modifiedCount > 0) {
        try {
          const { alertOwner } = await import('../services/ownerBot.js');
          const payment = await Payment.findOne({ yookassaPaymentId: paymentId }).lean();
          const client = payment?.userId ? await User.findById(payment.userId).lean() : null;
          await alertOwner(
            `↩️ Возврат платежа\n` +
            `Сумма: ${Number(payment?.amount || 0).toLocaleString('ru-RU')} ₽\n` +
            `Клиент: ${client?.email || client?.name || payment?.customerEmail || '—'}\n` +
            `Тариф: ${payment?.planId || '—'}`,
            'payment'
          );
        } catch (alertErr) {
          console.warn('[yookassaController:webhook] refund owner alert failed:', alertErr.message);
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
    // [v9.9.19.14] даже на ошибке обработки отвечаем 200 — ЮKassa не должна ретраить битый payload
    console.error('[yookassaController:yookassaWebhook]', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
};
