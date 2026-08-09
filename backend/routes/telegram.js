import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import { generateChannelPost, publishToChannel, getChannelStats, generateWeeklyContentPlan } from '../services/telegramChannelManager.js';
import { getMenu, generateMenuImprovements, applyMenuChanges, addCustomButton, toggleButton } from '../services/telegramMenuService.js';

const router = Router();

function getOwnerId(req) {
  return req.user?.id || req.user?._id;
}

router.post('/telegram/channel/post', protect, requireRole('owner','admin'), async (req, res) => {
  const { topic, niche, style, tone, length, options } = req.body;
  const post = await generateChannelPost({ topic, niche: niche || topic, style: style || tone || 'expert', length, language: 'ru' });
  const result = await publishToChannel({ text: post.text, imageUrl: post.imageUrl, caption: post.caption }, options || {});
  res.json({ success: true, post, publish: result });
});

router.get('/telegram/channel/stats', protect, requireRole('owner','admin'), async (req, res) => {
  const stats = await getChannelStats();
  res.json(stats);
});

router.post('/telegram/channel/plan', protect, requireRole('owner','admin'), async (req, res) => {
  const plan = await generateWeeklyContentPlan(req.user._id);
  res.json({ plan, days: plan.length });
});

router.post('/telegram/channel/publish-plan', protect, requireRole('owner','admin'), async (req, res) => {
  const { dayIndex } = req.body;
  const plan = await generateWeeklyContentPlan(req.user._id);
  const post = plan[dayIndex];
  if (!post) return res.status(400).json({ error: 'Invalid day index' });
  const result = await publishToChannel(post, { pin: false });
  res.json({ post, publish: result });
});

// === Dynamic menu analytics ===
router.get('/telegram/menu', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const buttons = await getMenu('main', getOwnerId(req));
    res.json({ success: true, buttons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/telegram/menu/analyze', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const changes = await generateMenuImprovements(getOwnerId(req));
    res.json({ success: true, changes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/telegram/menu/apply', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await applyMenuChanges(getOwnerId(req), req.body);
    const buttons = await getMenu('main', getOwnerId(req));
    res.json({ success: true, buttons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/telegram/menu/button', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const buttons = await addCustomButton(getOwnerId(req), req.body);
    res.json({ success: true, buttons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/telegram/menu/button/:callbackData', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const buttons = await toggleButton(getOwnerId(req), req.params.callbackData, req.body.active !== false);
    res.json({ success: true, buttons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/telegram/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('telegramId telegramUsername telegramChannelId telegramChannelName');
    res.json({ success: true, connected: !!user?.telegramId, userId: user?.telegramId, channelId: user?.telegramChannelId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
