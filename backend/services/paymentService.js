import { createNode } from './cognitiveMesh.js';

const PLANS = {
  free: { name: 'Free', price: 0, limits: { projects: 3, agents: 2, storage: '100MB' }, features: ['Basic AI', '3 projects', 'Community support'] },
  pro: { name: 'Pro', price: 990, limits: { projects: 20, agents: 10, storage: '2GB' }, features: ['Advanced AI', '20 projects', 'Priority support', 'Telegram bot', 'Analytics'] },
  agency: { name: 'Agency', price: 4990, limits: { projects: 999, agents: 50, storage: '10GB' }, features: ['All Pro features', 'Unlimited projects', 'White-label', 'API access', 'Dedicated support'] }
};

export function getPlan(planId) { return PLANS[planId] || PLANS.free; }

export async function createPayment(userId, planId, provider = 'yookassa') {
  const plan = getPlan(planId);
  if (plan.price === 0) return { success: true, planId, status: 'active', mock: true };
  const YOOKASSA_ENABLED = !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
  if (!YOOKASSA_ENABLED) {
    return { success: true, planId, status: 'pending', mock: true, paymentUrl: '#', message: 'Mock payment. Для реальной оплаты добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env или Owner Dashboard → API Keys' };
  }
  return { success: true, planId, status: 'pending', mock: false, paymentUrl: `https://yookassa.ru/pay/${userId}/${planId}`, message: 'Redirect to YooKassa' };
}

export async function activateSubscription(userId, planId) {
  await createNode({ type: 'system', content: `Subscription activated: ${planId} for user ${userId}`, confidence: 1, source: 'payment_service', metadata: { userId, planId, activatedAt: new Date(), type: 'subscription_activated' } });
  return { active: true, plan: getPlan(planId), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
}

export function checkQuota(user, action) {
  const plan = getPlan(user.subscription?.plan || 'free');
  const used = user.subscription?.used || {};
  const limits = plan.limits;
  if (action === 'project' && (used.projects || 0) >= limits.projects) return { allowed: false, reason: 'Project limit reached. Upgrade to Pro.' };
  if (action === 'agent' && (used.agents || 0) >= limits.agents) return { allowed: false, reason: 'Agent limit reached. Upgrade to Pro.' };
  return { allowed: true };
}
