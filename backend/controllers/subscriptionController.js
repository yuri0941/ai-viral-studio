import { Subscription } from '../models/index.js';
import { chatWithAI, extractText } from '../services/aiService.js';
import { adjustPrice } from '../services/dynamicPricing.js';
// [PLANCONFIG-ADMIN] цены/планы — из PlanConfig (БД) через синхронный кэш; legacy config/plans.js удалён
import { getPlansSync, getPlanSync } from '../services/planConfigCache.js';
import PlanConfig from '../models/PlanConfig.js';
import PriceChangeLog from '../models/PriceChangeLog.js';
import { invalidatePlanCache } from '../middleware/enforceQuota.js';

export const isStripeEnabled = false;

export const getPlans = async (req, res) => {
  try {
    const plans = getPlansSync().map((p) => ({
      id: p.plan,
      name: p.plan,
      price: p.price,
      currency: p.currency || 'RUB',
      interval: 'month',
      yearlyDiscountPercent: 20,
    }));
    return res.json({ success: true, plans });
  } catch (err) {
    console.error('[subscriptionController:getPlans]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const subscription = await Subscription.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      const free = {
        userId,
        plan: 'free',
        status: 'active',
        price: 0,
        currency: 'RUB',
        interval: 'month',
        autoRenew: false,
        startDate: new Date(),
      };
      return res.json({ success: true, subscription: free });
    }

    return res.json({ success: true, subscription });
  } catch (err) {
    console.error('[subscriptionController:getCurrentSubscription]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const history = await Subscription.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, history });
  } catch (err) {
    console.error('[subscriptionController:getSubscriptionHistory]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { plan, interval, currency, paymentMethod, provider, autoRenew, isTrial } = req.body || {};
    const planDoc = getPlanSync(plan);
    const planId = planDoc.plan;
    const curr = 'RUB'; // [PLANCONFIG-ADMIN] PlanConfig — RUB-only
    const basePrice = planDoc.price;
    // [P18] added: dynamic pricing AI adjustment
    const dynamic = await adjustPrice(basePrice, planId, userId);
    const price = dynamic.finalPrice;

    const now = new Date();
    const endDate = new Date(now);
    if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Deactivate previous subscriptions for this user
    await Subscription.updateMany(
      { userId, status: { $in: ['active', 'trialing'] } },
      { $set: { status: 'inactive' } }
    );

    const subscription = await Subscription.create({
      userId,
      plan: planId,
      status: isTrial ? 'trialing' : 'active',
      price,
      amount: price,
      currency: curr,
      interval: interval === 'year' ? 'year' : 'month',
      startDate: now,
      endDate,
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      trialEndsAt: isTrial ? endDate : undefined,
      autoRenew: autoRenew !== false,
      paymentMethod: paymentMethod || 'none',
      provider: provider || 'internal',
      isTrial: !!isTrial,
    });

    return res.status(201).json({ success: true, subscription });
  } catch (err) {
    console.error('[subscriptionController:createSubscription]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const allowed = ['status', 'autoRenew', 'paymentMethod', 'provider', 'providerPaymentId'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId },
      { $set: update },
      { new: true }
    ).lean();

    if (!subscription) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, subscription });
  } catch (err) {
    console.error('[subscriptionController:updateSubscription]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId, status: { $in: ['active', 'trialing'] } },
      { $set: { status: 'canceled', autoRenew: false } },
      { new: true }
    ).lean();

    if (!subscription) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, subscription });
  } catch (err) {
    console.error('[subscriptionController:cancelSubscription]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const checkTrialEnding = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const ending = await Subscription.find({
      userId,
      status: 'trialing',
      trialEndsAt: { $lte: inThreeDays, $gte: new Date() },
    }).lean();

    return res.json({ success: true, endingSoon: ending.length > 0, subscriptions: ending });
  } catch (err) {
    console.error('[subscriptionController:checkTrialEnding]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// [P18] AI Pricing Engine: analyze competitor prices and recommend plan pricing
export const analyzePricing = async (req, res) => {
  try {
    const { niche = 'SaaS', region = 'Global', competitorPrices = [] } = req.body || {};
    const currency = req.body?.currency || 'RUB';

    // [PLANCONFIG-ADMIN] fix: PLANS был объектом (PLANS.map падал с 500); источник — PlanConfig
    const currentPlans = getPlansSync().map((p) => ({
      plan: p.plan,
      currentPrice: p.price,
    }));

    const prompt = `Проанализируй рынок подписок для SaaS в нише "${niche}", регион ${region}.
Конкуренты: ${JSON.stringify(competitorPrices)}.
Текущие цены: ${JSON.stringify(currentPlans)}.
Предложи оптимальную ценовую стратегию для тарифов Free/Pro/Agency.
Верни СТРОГО JSON: { "recommendations": [{"plan", "currentPrice", "suggestedPrice", "reasoning"}], "marketPosition" }`;

    const ai = await chatWithAI(prompt, [], 'ru');
    let result = { recommendations: [], marketPosition: 'unknown' };
    try {
      const reply = extractText(ai);
      const match = reply.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(reply || '{}');
      if (Array.isArray(parsed.recommendations)) {
        result = { recommendations: parsed.recommendations, marketPosition: parsed.marketPosition || 'unknown' };
      }
    } catch (parseErr) {
      console.warn('[subscriptionController:analyzePricing] parse failed:', parseErr.message);
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[subscriptionController:analyzePricing]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// [P18] Apply AI-recommended price to a plan
// [PLANCONFIG-ADMIN] пишет в PlanConfig (БД) вместо in-memory overrides (те сбрасывались при рестарте)
export const updatePlanPrice = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { planId, price, reason } = req.body || {};
    const doc = await PlanConfig.findOne({ plan: String(planId || '').toLowerCase() });
    if (!doc) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || (doc.plan !== 'free' && price <= 0)) {
      return res.status(400).json({ success: false, error: 'Invalid price' });
    }
    const oldPrice = doc.price;
    if (oldPrice === price) return res.json({ success: true, planId: doc.plan, price, changed: false });
    doc.price = price;
    await doc.save();
    invalidatePlanCache();
    await PriceChangeLog.create({
      what: `tariff.${doc.plan}.price`,
      oldPrice,
      newPrice: price,
      source: 'cabinet',
      reason: reason || 'updatePlanPrice (legacy endpoint)',
      changedBy: req.user?._id || req.user?.id,
    });
    return res.json({ success: true, planId: doc.plan, currency: 'RUB', price, changed: true });
  } catch (err) {
    console.error('[subscriptionController:updatePlanPrice]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
