import { Subscription } from '../models/index.js';
import { chatWithAI } from '../services/aiService.js';
import { adjustPrice } from '../services/dynamicPricing.js';
import { PLANS, getPlanPrice } from '../config/plans.js'; // [P24] fixed: unified plans config

// [P16] In-memory price overrides applied by owner via AI Pricing Engine
const planPriceOverrides = { RUB: {}, USD: {}, EUR: {} };

export const isStripeEnabled = false;

export const getPlans = async (req, res) => {
  try {
    const currency = req.query.currency || 'RUB';
    const plans = Object.values(PLANS).map((p) => {
      const base = currency === 'USD' ? p.priceUSD : currency === 'EUR' ? p.priceEUR : p.priceRUB;
      const override = planPriceOverrides[currency]?.[p.id];
      return {
        id: p.id,
        name: p.name,
        price: override !== undefined ? override : base,
        currency,
        description: p.description,
        interval: 'month',
        yearlyDiscountPercent: 20,
      };
    });
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
    const planId = PLANS[plan]?.id || 'free';
    const curr = ['USD', 'EUR'].includes(currency) ? currency : 'RUB';
    const basePrice = getPlanPrice(planId, curr);
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
      currency: curr,
      interval: interval === 'year' ? 'year' : 'month',
      startDate: now,
      endDate,
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

    const currentPlans = PLANS.map((p) => ({
      plan: p.name,
      currentPrice: currency === 'USD' ? p.priceUSD : currency === 'EUR' ? p.priceEUR : p.priceRUB,
    }));

    const prompt = `Проанализируй рынок подписок для SaaS в нише "${niche}", регион ${region}.
Конкуренты: ${JSON.stringify(competitorPrices)}.
Текущие цены: ${JSON.stringify(currentPlans)}.
Предложи оптимальную ценовую стратегию для тарифов Free/Creator/Pro/Agency.
Верни СТРОГО JSON: { "recommendations": [{"plan", "currentPrice", "suggestedPrice", "reasoning"}], "marketPosition" }`;

    const ai = await chatWithAI(prompt, [], 'ru');
    let result = { recommendations: [], marketPosition: 'unknown' };
    try {
      const match = ai?.reply?.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(ai?.reply || '{}');
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
export const updatePlanPrice = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { planId, currency = 'RUB', price } = req.body || {};
    if (!Object.values(PLANS).some((p) => p.id === planId)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ success: false, error: 'Invalid price' });
    }
    if (!['RUB', 'USD', 'EUR'].includes(currency)) {
      return res.status(400).json({ success: false, error: 'Invalid currency' });
    }
    planPriceOverrides[currency][planId] = price;
    return res.json({ success: true, planId, currency, price });
  } catch (err) {
    console.error('[subscriptionController:updatePlanPrice]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
