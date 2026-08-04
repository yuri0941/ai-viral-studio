import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  viralScorePrediction,
  churnPrediction14,
  bestTimePerClient,
  revenueForecast,
  autoBudgeting,
} from '../services/predictiveEngine.js';
import { getReferralData } from '../services/referralService.js';

const router = express.Router();

// [MASTER-v5.0] added: real-shaped overview for CreatorDashboard
router.get('/overview', protect, (req, res) => res.json({ posts: 0, views: 0, subscribers: 0, engagement: 0, income: 0 }));
// [P16-FIX] added
router.get('/channels', (req, res) => res.json({ channels: [] }));

// [P18] added: Predictive Engine 2.0 routes
router.get('/viral-score', protect, async (req, res) => {
  try {
    const { content, niche } = req.query;
    const result = await viralScorePrediction(content, niche);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[analytics:viral-score]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/churn-risk/:userId', protect, async (req, res) => {
  try {
    const result = await churnPrediction14(req.params.userId);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[analytics:churn-risk]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/best-time/:platform', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const result = await bestTimePerClient(userId, req.params.platform);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[analytics:best-time]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/revenue-forecast', protect, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 90));
    const result = await revenueForecast(days);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[analytics:revenue-forecast]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/auto-budget', protect, async (req, res) => {
  try {
    const { freeBudget, platform } = req.body || {};
    const result = await autoBudgeting(freeBudget, platform);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[analytics:auto-budget]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [HOTFIX-2026-08-04] added — missing analytics routes
router.get('/vector-store/status', (req, res) => {
  res.json({ status: 'ok', provider: 'in-memory', records: 0, message: 'Vector store active (in-memory fallback)' });
});

router.get('/referrals', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const data = await getReferralData(userId);
    return res.json({ status: 'success', data });
  } catch (err) {
    console.error('[analytics:referrals]', err.message);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

export default router;
