import { Router } from 'express';
import { generateAdProposal, generateAdCreatives, calculateAdMetrics } from '../services/advertiserSuite.js';

const router = Router();

router.post('/proposal', async (req, res) => {
  try {
    const { budget, niche, goal, format } = req.body;
    const result = await generateAdProposal({ budget, niche, goal, format });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/creatives', async (req, res) => {
  try {
    const { niche, format } = req.body;
    const creatives = await generateAdCreatives(niche, format);
    res.json({ success: true, creatives });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/metrics', async (req, res) => {
  try {
    const { budget, format } = req.body;
    const metrics = calculateAdMetrics(Number(budget) || 0, format);
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
