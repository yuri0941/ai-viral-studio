import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { generateChannelPost, publishToChannel, generateWeeklyCalendar, analyzeChannelGrowth } from '../services/channelManager.js';

const router = Router();

router.post('/generate', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { type, topic, niche, style, length, language } = req.body;
    const post = await generateChannelPost({ type, topic, niche, style, length, language });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { content, scheduledTime } = req.body;
    const result = await publishToChannel(content, scheduledTime);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/calendar', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { niche, language } = req.query;
    const calendar = await generateWeeklyCalendar({ niche, language });
    res.json({ success: true, calendar });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/growth', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const data = await analyzeChannelGrowth();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
