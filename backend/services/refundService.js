import Refund from '../models/Refund.js';
import { createNode } from './cognitiveMesh.js';

export async function requestRefund(userId, amount, reason, paymentId = '') {
  const refund = await Refund.create({
    userId: String(userId || ''),
    amount: Number(amount) || 0,
    reason: String(reason || ''),
    paymentId: String(paymentId || ''),
  });
  await createNode({
    type: 'system',
    content: `Refund requested: ${refund.amount}₽ for user ${refund.userId}`,
    confidence: 1,
    source: 'refund_service',
    metadata: { refundId: String(refund._id), userId: refund.userId, amount: refund.amount, type: 'refund_requested' }
  });
  return refund;
}

// [REAL-DATA-2] контур ЖИВОЙ → переведён на паттерн adminRefundHandler: реальный createRefund
// ЮKassa (ключи — ApiKeys, проверка в роуте). Без ключей/без paymentId — честный отказ,
// mock-completed больше нет. При сбое статус остаётся pending (повтор возможен), ошибка — в lastError.
export async function processRefund(refundId, ownerId, yookassaEnabled = false) {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error('Refund not found');
  if (refund.status !== 'pending') throw new Error('Refund already processed');
  if (!yookassaEnabled) throw new Error('Ключи ЮKassa не настроены в кабинете (API Keys) — возврат запрещён');
  if (!refund.paymentId) throw new Error('Без ID платежа ЮKassa реальный возврат невозможен');

  try {
    const { createRefund } = await import('./yookassaService.js');
    const payer = refund.userId
      ? await (await import('../models/User.js')).default.findById(refund.userId).lean().catch(() => null)
      : null;
    const receipt = payer?.email ? {
      customer: { email: payer.email },
      items: [{
        description: 'Возврат: AI Viral Studio',
        quantity: '1.00',
        amount: { value: Number(refund.amount).toFixed(2), currency: 'RUB' },
        vat_code: 1,
        payment_mode: 'full_payment',
        payment_subject: 'service',
      }],
    } : null;
    const result = await createRefund({
      paymentId: refund.paymentId,
      amount: refund.amount,
      currency: 'RUB',
      description: refund.reason || `Возврат ${refund.amount}₽ пользователю ${refund.userId}`,
      receipt,
    });

    refund.status = 'completed';
    refund.processedAt = new Date();
    refund.processedBy = String(ownerId || '');
    refund.yookassaRefundId = result.refundId || '';
    refund.lastError = '';
    await refund.save();

    await (await import('../models/Payment.js')).default.updateOne(
      { yookassaPaymentId: refund.paymentId },
      { $set: { status: 'refunded', refundedAt: new Date(), refundReceiptId: result.refundId } }
    ).catch(() => {});

    await createNode({
      type: 'system',
      content: `Refund processed (yookassa): ${refund.amount}₽`,
      confidence: 1,
      source: 'refund_service',
      metadata: { refundId: String(refund._id), ownerId: String(ownerId || ''), type: 'refund_processed' }
    });
    return refund;
  } catch (err) {
    refund.lastError = String(err.message || err).slice(0, 300);
    await refund.save().catch(() => {});
    throw err;
  }
}

export async function listRefunds(status = 'all') {
  const query = status === 'all' ? {} : { status };
  return Refund.find(query).sort({ createdAt: -1 }).limit(200).lean();
}

export async function getRefundStats() {
  const refunds = await Refund.find().select('status amount').lean();
  const total = refunds.length;
  const pending = refunds.filter(r => r.status === 'pending').length;
  const completed = refunds.filter(r => r.status === 'completed').length;
  const totalAmount = refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);
  return { total, pending, completed, totalAmount };
}
