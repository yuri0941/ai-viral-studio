import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { integrationStatus } from '../utils/integrationStatus.js';
import { getVkCreds, refreshVkToken, isVkTokenExpired } from '../services/vkTokenService.js';
import { publishToVKWall } from '../services/vkPublishService.js';

const router = express.Router();

// PKCE state store: in-memory Map with 10-minute TTL. Single Render instance is fine.
const stateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function cleanExpiredStates() {
  const now = Date.now();
  for (const [key, entry] of stateStore) {
    if (now - entry.createdAt > STATE_TTL_MS) stateStore.delete(key);
  }
}
setInterval(cleanExpiredStates, 60 * 1000);

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeChallenge(verifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI || 'https://aiviral-studio.ru/auth/vk/callback';
const VK_FRONTEND_URL = process.env.FRONTEND_URL || 'https://aiviral-studio.ru';
const VK_TOKEN_HOST = process.env.VK_TOKEN_HOST || 'id.vk.ru';

const VK_SCOPES = 'vkid.personal_info wall photos';

router.get('/vk/auth-url', protect, async (req, res) => {
  try {
    const status = await integrationStatus('vk', req.user.id);
    if (!status.configured) {
      return res.json({
        success: false,
        configured: false,
        error: 'vk_not_configured',
        setupGuide: [
          '1. Откройте https://dev.vk.com/apps → ai-viral-studio',
          '2. Скопируйте ID приложения (54714375)',
          '3. Вставьте в ApiKeysTab → VK Client ID',
          '4. Скопируйте Защищённый ключ',
          '5. Вставьте в ApiKeysTab → VK Client Secret',
          '6. Нажмите «Сохранить и применить»'
        ]
      });
    }

    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const state = crypto.randomBytes(16).toString('hex');
    stateStore.set(state, {
      codeVerifier,
      userId: req.user.id,
      scope: VK_SCOPES,
      createdAt: Date.now()
    });

    const authUrl = 'https://id.vk.com/authorize?' + new URLSearchParams({
      response_type: 'code',
      client_id: status.clientId,
      redirect_uri: VK_REDIRECT_URI,
      state,
      code_challenge: generateCodeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      scope: VK_SCOPES
    }).toString();

    return res.json({ success: true, configured: true, authUrl, state });
  } catch (err) {
    console.error('[VK auth-url] error:', err.message);
    return res.json({ success: false, error: 'server_error', message: err.message });
  }
});

router.post('/vk/callback', protect, async (req, res) => {
  try {
    const { code, state, device_id } = req.body || {};
    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'missing_params' });
    }
    const stored = stateStore.get(state);
    if (!stored) {
      return res.status(400).json({ success: false, error: 'state_expired', message: 'Сессия устарела — начните подключение заново' });
    }
    if (Date.now() - stored.createdAt > STATE_TTL_MS) {
      stateStore.delete(state);
      return res.status(400).json({ success: false, error: 'state_expired', message: 'Сессия устарела — начните подключение заново' });
    }
    if (String(stored.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'state_mismatch' });
    }

    const { clientId, clientSecret } = await getVkCreds();
    if (!clientId || !clientSecret) {
      return res.json({ success: false, error: 'vk_not_configured' });
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: VK_REDIRECT_URI,
      state,
      code_verifier: stored.codeVerifier,
    });
    if (device_id) tokenParams.append('device_id', device_id);

    let tokenData;
    try {
      const tokenRes = await axios.post(`https://${VK_TOKEN_HOST}/oauth2/auth`, tokenParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000
      });
      tokenData = tokenRes.data;
    } catch (exchangeErr) {
      const vkErr = exchangeErr.response?.data || {};
      const reason = vkErr.error_description || vkErr.error || exchangeErr.message;
      const safeError = vkErr.error || 'vk_exchange_failed';
      console.log('[VK callback] exchange failed:', safeError);
      return res.status(400).json({
        success: false,
        error: safeError,
        reason,
        hint: 'Проверьте redirect URI в настройках VK ID и попробуйте подключить заново'
      });
    }

    if (tokenData.error) {
      const reason = tokenData.error_description || tokenData.error;
      console.log('[VK callback] token error:', tokenData.error);
      return res.status(400).json({
        success: false,
        error: tokenData.error,
        reason,
        hint: 'Проверьте redirect URI в настройках VK ID и попробуйте подключить заново'
      });
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'no_access_token', reason: 'VK не вернул токен доступа' });
    }

    const userRes = await axios.post(`https://${VK_TOKEN_HOST}/oauth2/user_info`, new URLSearchParams({
      client_id: clientId,
      access_token: accessToken,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    const userInfo = userRes.data;
    const vkUser = userInfo?.user || {};

    const scopeString = tokenData.scope || stored.scope || VK_SCOPES;
    const scopes = typeof scopeString === 'string' ? scopeString.split(/\s+/) : (Array.isArray(scopeString) ? scopeString : []);
    const expiresIn = Number(tokenData.expires_in) || 0;

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'socials.vk.userId': String(vkUser.user_id || vkUser.id || ''),
        'socials.vk.username': [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ') || `vk${vkUser.user_id || vkUser.id}`,
        'socials.vk.link': vkUser.user_id || vkUser.id ? `https://vk.com/id${vkUser.user_id || vkUser.id}` : '',
        'socials.vk.enabled': true,
        'socials.vk.scope': scopes,
        'socials.vk.needsScope': !scopes.includes('wall'),
        vkToken: accessToken,
        vkRefreshToken: tokenData.refresh_token || '',
        vkTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
        vkUserId: String(vkUser.user_id || vkUser.id || ''),
        vkConnectedAt: new Date(),
      }
    });

    stateStore.delete(state);
    return res.json({ success: true, userId: vkUser.user_id || vkUser.id });
  } catch (err) {
    const reason = err.response?.data?.error_description || err.response?.data?.error || err.message;
    console.error('[VK callback] error:', reason);
    return res.status(400).json({ success: false, error: 'server_error', reason, hint: 'Попробуйте подключить VK ещё раз' });
  }
});

router.get('/vk/status', protect, async (req, res) => {
  try {
    const status = await integrationStatus('vk', req.user.id);
    const user = await User.findById(req.user.id).select('socials.vk vkUserId').lean();
    const connected = !!(user?.socials?.vk?.userId || user?.vkUserId);
    const scope = user?.socials?.vk?.scope || [];
    const needsScope = connected && !scope.includes('wall');
    return res.json({
      success: true,
      configured: status.configured,
      connected,
      needsScope,
      userId: user?.socials?.vk?.userId || user?.vkUserId || null,
      accountName: user?.socials?.vk?.username || null,
      setupGuide: status.configured ? undefined : [
        '1. Откройте https://dev.vk.com/apps → ai-viral-studio',
        '2. Скопируйте ID приложения (54714375)',
        '3. Вставьте в ApiKeysTab → VK Client ID',
        '4. Скопируйте Защищённый ключ',
        '5. Вставьте в ApiKeysTab → VK Client Secret',
        '6. Нажмите «Сохранить и применить»'
      ]
    });
  } catch (err) {
    console.error('[VK status] error:', err.message);
    return res.json({ success: false, configured: false, connected: false, needsScope: false });
  }
});

router.delete('/vk', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'socials.vk': { userId: '', username: '', link: '', enabled: false, scope: [], needsScope: true },
        vkToken: '',
        vkRefreshToken: '',
        vkTokenExpiresAt: null,
        vkUserId: '',
      }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[VK disconnect] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/vk/publish', protect, async (req, res) => {
  try {
    const { text, link } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'empty_text', hint: 'Добавьте текст поста' });
    }
    const user = await User.findById(req.user.id).select('+vkToken +vkRefreshToken socials.vk vkUserId');
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' });
    }
    const result = await publishToVKWall(user, { text, link });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('[VK publish] error:', err.message);
    return res.status(400).json({ success: false, error: 'server_error', reason: err.message, hint: 'Попробуйте опубликовать позже' });
  }
});

export default router;
