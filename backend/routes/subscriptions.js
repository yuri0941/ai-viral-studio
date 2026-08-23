import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { checkConsent } from '../middleware/checkConsent.js';
import {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  checkTrialEnding,
  analyzePricing,
  updatePlanPrice,
} from '../controllers/subscriptionController.js';
import { getDynamicPricingStatus, adjustPrice } from '../services/dynamicPricing.js';
import { detectCurrencyByIP } from '../services/geoCurrencyService.js';
import { getPaymentMethods } from '../services/paymentMethods.js'; // [P24] fixed: payment methods service

const router = Router();

router.get('/plans', getPlans);
router.get('/current', protect, getCurrentSubscription);
router.get('/history', protect, getSubscriptionHistory);
router.post('/', protect, checkConsent, createSubscription);
router.patch('/:id', protect, checkConsent, updateSubscription);
router.delete('/:id/cancel', protect, checkConsent, cancelSubscription);
router.get('/trial-ending', protect, checkTrialEnding);
// [P18] added: AI Pricing Engine routes
router.post('/analyze-pricing', protect, analyzePricing);
router.post('/plan-price', protect, updatePlanPrice);

// [P18] added: dynamic pricing status for badges
router.get('/dynamic-pricing-status', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const status = await getDynamicPricingStatus(userId);
    return res.json({ success: true, data: status });
  } catch (err) {
    console.error('[subscriptions:dynamic-pricing-status]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [P24] added: geo-currency + payment methods config
router.get('/config', async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    const ip = String(rawIp).split(',')[0].trim();
    const country = ip && (ip === '127.0.0.1' || ip === '::1') ? 'RU' : null;
    const currency = detectCurrencyByIP(ip);
    const paymentMethods = await getPaymentMethods(country, currency);
    return res.json({ success: true, currency, country, paymentMethods });
  } catch (err) {
    console.error('[subscriptions:config]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [P24] added: simple exchange-rate fallback
const EXCHANGE_RATES = {
  RUB: 1,
  USD: 0.011,
  EUR: 0.01,
  UAH: 0.45,
  KZT: 5.5,
  BYN: 0.036,
  GBP: 0.0085,
};
router.get('/exchange-rate', async (req, res) => {
  try {
    const { from = 'RUB', to = 'USD' } = req.query || {};
    const rate = (EXCHANGE_RATES[to] || 1) / (EXCHANGE_RATES[from] || 1);
    return res.json({ success: true, from, to, rate });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [v8.0-PART1] added: dynamic pricing endpoints
// [PLANCONFIG-ADMIN] базовые цены — из PlanConfig (кэш), legacy-хардкод 7900/19900 удалён
import { getPlansSync, getPlanSync } from '../services/planConfigCache.js';

router.get('/plans-dynamic', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const basePlans = getPlansSync().map(p => ({ id: p.plan, name: p.plan, basePrice: p.price }));
    const data = await Promise.all(
      basePlans.map(async plan => {
        const pricing = await adjustPrice(plan.basePrice, plan.id, userId);
        return { ...plan, ...pricing };
      })
    );
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[subscriptions:plans-dynamic]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/my-price', protect, async (req, res) => {
  try {
    const { plan = 'pro' } = req.query;
    const userId = req.user?._id || req.user?.id;
    const basePrice = getPlanSync(plan).price;
    const pricing = await adjustPrice(basePrice, plan, userId);
    return res.json({ success: true, data: pricing });
  } catch (err) {
    console.error('[subscriptions:my-price]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
