import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { generateReferralLink, getLeaderboard, startChallenge } from '../services/growthLoop.js';

const router = Router();

router.get('/referral', protect, async (req, res) => {
  try {
    const data = await generateReferralLink(req.user._id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { period } = req.query;
    const data = await getLeaderboard(period || 'month');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/challenge', protect, async (req, res) => {
  try {
    const { theme } = req.query;
    const data = await startChallenge(theme || 'viral-august');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
