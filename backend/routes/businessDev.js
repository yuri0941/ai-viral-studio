import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { findProspects, generateColdEmail, scheduleFollowUp, getBusinessDevStats } from '../services/businessDev.js';

const router = Router();

router.get('/prospects', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { niche, location, limit } = req.query;
    const data = await findProspects(niche, location, Number(limit) || 20);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/email', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { prospect, niche } = req.body;
    const email = await generateColdEmail(prospect, niche);
    res.json({ success: true, email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/follow-up', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { prospectId, step } = req.body;
    const data = await scheduleFollowUp(prospectId, step);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const data = await getBusinessDevStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
