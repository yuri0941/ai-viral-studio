import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const VK_APP_ID = process.env.VK_APP_ID;
const VK_APP_SECRET = process.env.VK_APP_SECRET;
const REDIRECT_URI = `${process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://aiviral-backend.onrender.com'}/api/vk/callback`;

router.get('/vk/auth-url', protect, (req, res) => {
  if (!VK_APP_ID || !VK_APP_SECRET) {
    console.error('VK ENV MISSING:', { VK_APP_ID: !!VK_APP_ID, VK_APP_SECRET: !!VK_APP_SECRET });
    return res.status(500).json({ success: false, error: 'VK not configured on server' });
  }
  const scope = 'video,wall,groups,offline';
  const authUrl = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&response_type=code&v=5.199&state=${req.user._id}`;
  res.json({ success: true, authUrl });
});

router.get('/vk/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!VK_APP_ID || !VK_APP_SECRET) {
      console.error('VK ENV MISSING:', { VK_APP_ID: !!VK_APP_ID, VK_APP_SECRET: !!VK_APP_SECRET });
      return res.redirect(`${process.env.FRONTEND_URL || 'https://aiviral.onrender.com'}/settings?vk=error`);
    }
    const tokenRes = await axios.get('https://oauth.vk.com/access_token', {
      params: { client_id: VK_APP_ID, client_secret: VK_APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    await User.findByIdAndUpdate(userId, {
      vkToken: tokenRes.data.access_token,
      vkUserId: tokenRes.data.user_id,
      vkConnectedAt: new Date()
    });
    res.redirect(`${process.env.FRONTEND_URL || 'https://aiviral.onrender.com'}/settings?vk=connected`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL || 'https://aiviral.onrender.com'}/settings?vk=error`);
  }
});

router.get('/vk/status', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('vkToken vkUserId');
  res.json({ success: true, connected: !!user?.vkToken, userId: user?.vkUserId });
});

export default router;
