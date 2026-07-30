import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStatus,
  sendTestEmail,
  triggerTrialEndingEmail,
  triggerSubscriptionCanceledEmail,
  triggerRefundRequestEmail,
} from '../controllers/emailController.js';

const router = Router();

router.get('/status', protect, getStatus);
router.post('/test', protect, sendTestEmail);
router.post('/trial-ending', protect, triggerTrialEndingEmail);
router.post('/subscription-canceled', protect, triggerSubscriptionCanceledEmail);
router.post('/refund-request', protect, triggerRefundRequestEmail);

export default router;
