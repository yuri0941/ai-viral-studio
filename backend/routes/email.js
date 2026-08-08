import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import {
  getStatus,
  sendTestEmail,
  triggerTrialEndingEmail,
  triggerSubscriptionCanceledEmail,
  triggerRefundRequestEmail,
} from '../controllers/emailController.js';
import { getEmailStatus, resendVerificationEmail } from '../services/emailService.js';

const router = Router();

router.get('/status', protect, requireRole('owner', 'admin'), async (req, res) => {
  res.json(getEmailStatus());
});
router.post('/resend-verification', protect, async (req, res) => {
  try {
    const result = await resendVerificationEmail(req.user.id || req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/v2/status', protect, getStatus);
router.post('/test', protect, sendTestEmail);
router.post('/trial-ending', protect, triggerTrialEndingEmail);
router.post('/subscription-canceled', protect, triggerSubscriptionCanceledEmail);
router.post('/refund-request', protect, triggerRefundRequestEmail);

export default router;
