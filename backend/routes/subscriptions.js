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
} from '../controllers/subscriptionController.js';

const router = Router();

router.get('/plans', getPlans);
router.get('/current', protect, getCurrentSubscription);
router.get('/history', protect, getSubscriptionHistory);
router.post('/', protect, checkConsent, createSubscription);
router.patch('/:id', protect, checkConsent, updateSubscription);
router.delete('/:id/cancel', protect, checkConsent, cancelSubscription);
router.get('/trial-ending', protect, checkTrialEnding);

export default router;
