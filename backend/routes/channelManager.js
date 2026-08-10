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
    console.error('[channelManager/calendar]', err.message);
    const fallback = [];
    const types = ['value','promo','case','viral','poll','value','case'];
    for (let i = 0; i < 7; i++) {
      fallback.push({
        day: i + 1,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        type: types[i],
        title: '',
        text: '',
        status: 'draft'
      });
    }
    res.json({ success: true, calendar: fallback });
  }
});

router.get('/growth', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const data = await analyzeChannelGrowth();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[channelManager/growth]', err.message);
    res.json({ success: true, growth: { subscribers: 0, views: 0, posts: 0, growthRate: 0, recommendation: 'Нет данных — подключите Telegram-канал.', error: err.message } });
  }
});

export default router;
