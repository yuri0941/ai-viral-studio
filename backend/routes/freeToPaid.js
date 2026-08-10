import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { checkFreeLimits, incrementUsage, startGracePeriod, checkGracePeriod } from '../services/freeToPaid.js';
import User from '../models/User.js';

const router = Router();

router.get('/limits', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const actions = ['posts', 'generations', 'analytics', 'scheduling'];
    const result = {};
    for (const action of actions) {
      result[action] = checkFreeLimits(user, action);
    }
    res.json({ success: true, limits: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/use/:action', protect, async (req, res) => {
  try {
    const result = await incrementUsage(req.user._id, req.params.action, req.body.count || 1);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/grace', protect, async (req, res) => {
  try {
    const result = await startGracePeriod(req.user._id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/grace', protect, async (req, res) => {
  try {
    const result = await checkGracePeriod(req.user._id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
