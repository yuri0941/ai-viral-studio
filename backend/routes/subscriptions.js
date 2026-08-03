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
import { getDynamicPricingStatus } from '../services/dynamicPricing.js';

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

export default router;
