import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { startDripCampaign, checkUpsellTriggers, activateFOMO, getDripStats, DRIP_SEQUENCE, UPSELL_TRIGGERS } from '../services/salesAutopilot.js';

const router = Router();

router.post('/start/:userId', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await startDripCampaign(req.params.userId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/check-triggers/:userId', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await checkUpsellTriggers(req.params.userId, req.body.metrics || {});
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fomo/:userId', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await activateFOMO(req.params.userId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const data = await getDripStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/steps', protect, requireRole('owner', 'admin'), async (req, res) => {
  res.json({ success: true, steps: DRIP_SEQUENCE });
});

router.get('/triggers', protect, requireRole('owner', 'admin'), async (req, res) => {
  const triggers = Object.entries(UPSELL_TRIGGERS).map(([key, cfg]) => ({ key, ...cfg }));
  res.json({ success: true, triggers });
});

export default router;
