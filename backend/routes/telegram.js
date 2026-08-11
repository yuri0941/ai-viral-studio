import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import { generateChannelPost, publishToChannel, getChannelStats, generateWeeklyContentPlan } from '../services/telegramChannelManager.js';
import { getMenu, generateMenuImprovements, applyMenuChanges, addCustomButton, toggleButton } from '../services/telegramMenuService.js';
import { integrationStatus } from '../utils/integrationStatus.js';
import { createConnectToken } from '../utils/telegramConnectStore.js';

const router = Router();
const BOT_LINK = process.env.TELEGRAM_BOT_LINK || process.env.TELEGRAM_OMEGA_BOT_LINK || 'https://t.me/aiviral_omega_bot';

function getOwnerId(req) {
  return req.user?.id || req.user?._id;
}

// [v9.9.19.7] Telegram deep-link connect for ANY authenticated user
router.post('/telegram/connect-link', protect, async (req, res) => {
  try {
    const status = await integrationStatus('telegram', req.user?.id || req.user?._id);
    if (!status.configured) {
      return res.json({ success: false, configured: false, error: 'telegram_bot_not_configured' });
    }
    const token = createConnectToken(req.user?.id || req.user?._id);
    return res.json({ success: true, configured: true, url: `${BOT_LINK}?start=connect_${token}`, botLink: BOT_LINK });
  } catch (err) {
    console.error('[telegram connect-link] error:', err.message);
    return res.json({ success: false, error: 'server_error' });
  }
});

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
    const [status, user] = await Promise.all([
      integrationStatus('telegram', req.user?._id || req.user?.id),
      User.findById(req.user._id).select('telegramId telegramUsername telegramChannelId telegramChannelName socials.telegram').lean()
    ]);
    const connected = !!(user?.telegramId || user?.socials?.telegram?.userId);
    res.json({
      success: true,
      configured: status.configured,
      connected,
      userId: user?.telegramId || user?.socials?.telegram?.userId || null,
      username: user?.telegramUsername || user?.socials?.telegram?.username || null,
      channelId: user?.telegramChannelId || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
