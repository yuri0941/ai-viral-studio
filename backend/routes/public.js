import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { getPlan, createPayment, activateSubscription, checkQuota } from '../services/paymentService.js';
import { getReferralData, registerReferral } from '../services/referralService.js';
import { joinWaitlist, getWaitlist, approveWaitlist } from '../services/waitlistService.js';

const router = Router();

// Public (no auth)
router.get('/plans', (req, res) => {
  res.json({ plans: { free: getPlan('free'), pro: getPlan('pro'), agency: getPlan('agency') } });
});

router.post('/waitlist', async (req, res) => {
  try {
    const { email, source } = req.body;
    const result = await joinWaitlist(email, source);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Auth required
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { planId, provider } = req.body;
    const payment = await createPayment(req.user.id || req.user._id, planId, provider);
    res.json(payment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/subscribe/activate', protect, async (req, res) => {
  try {
    const { planId } = req.body;
    const sub = await activateSubscription(req.user.id || req.user._id, planId);
    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/quota', protect, async (req, res) => {
  try {
    const { action } = req.query;
    const result = checkQuota(req.user, action);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/referral', protect, async (req, res) => {
  try {
    const stats = await getReferralData(req.user.id || req.user._id);
    res.json({
      code: stats.code,
      link: stats.link,
      total: stats.count,
      active: Math.max(0, stats.count - stats.paidCount),
      earnings: stats.earnings,
      creditBalance: stats.creditBalance,
      tier: stats.tier,
      tierLabel: stats.tierLabel,
      referralsToNext: stats.referralsToNext
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/referral/track', protect, async (req, res) => {
  try {
    const { referredId, code } = req.body;
    const result = await registerReferral(referredId, code);
    res.json({ success: !!result, reward: '7 days Pro free', referrer: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Owner only
router.get('/waitlist/all', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    res.json({ waitlist: getWaitlist() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/waitlist/approve', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { email } = req.body;
    const entry = approveWaitlist(email);
    res.json({ approved: !!entry, entry });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
