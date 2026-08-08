import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { generateChannelPost, publishToChannel, getChannelStats, generateWeeklyContentPlan } from '../services/telegramChannelManager.js';

const router = Router();

router.post('/channel/post', protect, requireRole('owner','admin'), async (req, res) => {
  const { topic, tone, length, options } = req.body;
  const post = await generateChannelPost(topic, tone, length);
  const result = await publishToChannel(post, options || {});
  res.json({ post, publish: result });
});

router.get('/channel/stats', protect, requireRole('owner','admin'), async (req, res) => {
  const stats = await getChannelStats();
  res.json(stats);
});

router.post('/channel/plan', protect, requireRole('owner','admin'), async (req, res) => {
  const plan = await generateWeeklyContentPlan(req.user._id);
  res.json({ plan, days: plan.length });
});

router.post('/channel/publish-plan', protect, requireRole('owner','admin'), async (req, res) => {
  const { dayIndex } = req.body;
  const plan = await generateWeeklyContentPlan(req.user._id);
  const post = plan[dayIndex];
  if (!post) return res.status(400).json({ error: 'Invalid day index' });
  const result = await publishToChannel(post, { pin: false });
  res.json({ post, publish: result });
});

export default router;
