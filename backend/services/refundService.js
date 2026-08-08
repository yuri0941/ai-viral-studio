import { createNode } from './cognitiveMesh.js';

const REFUNDS = [];

export async function requestRefund(userId, amount, reason, paymentId = '') {
  const refund = {
    id: `ref-${Date.now()}`,
    userId,
    amount: Number(amount) || 0,
    reason,
    paymentId,
    status: 'pending',
    createdAt: new Date(),
    processedAt: null
  };
  REFUNDS.push(refund);
  await createNode({
    type: 'system',
    content: `Refund requested: ${amount}₽ for user ${userId}`,
    confidence: 1,
    source: 'refund_service',
    metadata: { refundId: refund.id, userId, amount, type: 'refund_requested' }
  });
  return refund;
}

export async function processRefund(refundId, ownerId, yookassaEnabled = false) {
  const refund = REFUNDS.find(r => r.id === refundId);
  if (!refund) throw new Error('Refund not found');
  if (refund.status !== 'pending') throw new Error('Refund already processed');

  if (!yookassaEnabled) {
    refund.status = 'completed';
    refund.processedAt = new Date();
    refund.mock = true;
    refund.message = 'Mock refund processed. Для реального возврата подключите ЮKassa (YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY в .env)';
    await createNode({
      type: 'system',
      content: `Refund processed (mock): ${refund.amount}₽`,
      confidence: 1,
      source: 'refund_service',
      metadata: { refundId, ownerId, type: 'refund_processed' }
    });
    return refund;
  }

  refund.status = 'completed';
  refund.processedAt = new Date();
  return refund;
}

export function listRefunds(status = 'all') {
  return status === 'all' ? REFUNDS : REFUNDS.filter(r => r.status === status);
}

export function getRefundStats() {
  const total = REFUNDS.length;
  const pending = REFUNDS.filter(r => r.status === 'pending').length;
  const completed = REFUNDS.filter(r => r.status === 'completed').length;
  const totalAmount = REFUNDS.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);
  return { total, pending, completed, totalAmount };
}
