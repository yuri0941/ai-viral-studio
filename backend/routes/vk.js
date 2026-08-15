import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { integrationStatus } from '../utils/integrationStatus.js';
import { getVkCreds, refreshVkToken, isVkTokenExpired } from '../services/vkTokenService.js';
import { publishToVKWall, requeueVkFailedPosts, vkApi, uploadPhotoToVK, uploadVideoToVK } from '../services/vkPublishService.js';
import { isVkPublishingEnabled } from '../utils/connectedSocials.js';
import { preparePhotoBuffer, prepareVideoBuffer, fetchMediaBuffer } from '../services/vkMediaPipeline.js';
import sharp from 'sharp';

const router = express.Router();

function maskKey(key) {
  if (!key) return ''
  if (key.length < 14) return '••••'
  return `${key.slice(0, 6)}••••${key.slice(-4)}`
}

function normalizeGroupId(raw) {
  if (!raw) return ''
  const str = String(raw).trim().replace(/^-/, '')
  return /^\d+$/.test(str) ? str : ''
}

// [v9.9.19.15.8] VK community token permission bits from groups.getTokenPermissions
// [v9.9.19.15.11] permissions are checked by name from API response; video is informational only.
const VK_SCOPE_BITS = {
  photos: 4,
  video: 16,
  messages: 4096,
  wall: 8192,
  docs: 131072,
  manage: 262144,
}

function decodeVkPermissions(permRes = {}) {
  const permissions = {}

  // Prefer named list returned by VK API: [{name, setting}, ...]
  if (Array.isArray(permRes.permissions)) {
    for (const item of permRes.permissions) {
      const name = item?.name
      if (name) permissions[name] = (item.setting || 0) > 0
    }
  }

  // Fallback / complement via bitmask
  const mask = permRes.mask || 0
  for (const [name, bit] of Object.entries(VK_SCOPE_BITS)) {
    if (permissions[name] === undefined) {
      permissions[name] = (mask & bit) === bit
    }
  }

  // Video is not exposed in VK community-key UI, so it is informational only
  const required = ['wall', 'photos', 'messages']
  const missing = required.filter(name => !permissions[name])
  return { permissions, missing }
}

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
  // [v9.9.19.15.17] kill switch: VK publishing fully disabled
  if (!isVkPublishingEnabled()) {
    return res.json({ success: true, configured: false, disabled: true, connected: false, hasCommunityKey: false, groupId: '', groupIdValid: false, maskedKey: '', groupName: null, accountName: null });
  }

  try {
    const appStatus = await integrationStatus('vk', req.user.id);
    // [v9.9.19.15.5] read from root-level fields to avoid socials path collision
    const user = await User.findById(req.user.id).select('+vkCommunityKey vkGroupId vkConnected vkPermissionMask vkUserId socials.vk').lean();
    const groupIdRaw = user?.vkGroupId || '';
    const groupId = normalizeGroupId(groupIdRaw);
    const hasKey = !!user?.vkCommunityKey;
    const connected = hasKey && !!groupId;
    const decoded = decodeVkPermissions({ mask: user?.vkPermissionMask || 0 });
    return res.json({
      success: true,
      configured: appStatus.configured,
      connected,
      hasCommunityKey: hasKey,
      groupId: groupIdRaw,
      groupIdValid: !!groupId,
      maskedKey: maskKey(user?.vkCommunityKey),
      groupName: user?.socials?.vk?.groupName || null,
      accountName: user?.socials?.vk?.username || null,
      permissions: decoded.permissions,
      missing: decoded.missing,
      status: (connected && decoded.permissions.wall && decoded.permissions.photos && decoded.permissions.messages) ? 'working' : (connected ? 'limited' : 'disconnected'),
    });
  } catch (err) {
    console.error('[VK status] error:', err.message);
    return res.json({ success: false, configured: false, connected: false, hasCommunityKey: false, groupId: '', groupIdValid: false, maskedKey: '', groupName: null, accountName: null });
  }
});

router.post('/vk/community', protect, async (req, res) => {
  try {
    const { communityKey, groupId } = req.body || {};
    if (!communityKey || !communityKey.trim()) {
      return res.status(400).json({ success: false, error: 'missing_key', message: 'Укажите ключ сообщества' });
    }
    const key = communityKey.trim();
    if (key.length < 10) {
      return res.status(400).json({ success: false, error: 'key_too_short', message: 'Ключ сообщества VK должен быть не короче 10 символов' });
    }
    const normalizedGroupId = normalizeGroupId(groupId);
    if (!normalizedGroupId) {
      return res.status(400).json({ success: false, error: 'invalid_group', message: 'Укажите числовой ID группы VK' });
    }
    // [v9.9.19.15.5] store at root level to avoid Mongoose socials path collision
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        vkCommunityKey: key,
        vkGroupId: normalizedGroupId,
        vkConnected: true,
        'socials.vk.enabled': true,
      }
    });
    // [v9.9.19.15.17] do not requeue when VK publishing is globally disabled
    const requeue = isVkPublishingEnabled() ? await requeueVkFailedPosts(req.user.id, normalizedGroupId) : { requeued: 0 };
    return res.json({ success: true, groupId: normalizedGroupId, maskedKey: maskKey(key), requeued: requeue.requeued || 0 });
  } catch (err) {
    console.error('[VK community save] error:', err.message);
    return res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

router.post('/vk/test', protect, async (req, res) => {
  // [v9.9.19.15.17] kill switch: no VK API calls
  if (!isVkPublishingEnabled()) {
    res.locals.monitoringSkipError = true // [BACKUP-ALERTS-FIX] expected noise, not a server error
    return res.json({ success: false, skipped: true, reason: 'vk_disabled' });
  }

  try {
    // [v9.9.19.15.8] test key from root-level fields + decode token permissions
    const user = await User.findById(req.user.id).select('+vkCommunityKey vkGroupId vkPermissionMask socials.vk').lean();
    const communityKey = user?.vkCommunityKey;
    const groupId = normalizeGroupId(user?.vkGroupId);
    if (!communityKey) {
      return res.status(400).json({ success: false, error: 'missing_key', message: 'Ключ сообщества не сохранён' });
    }
    if (!groupId) {
      return res.status(400).json({ success: false, error: 'invalid_group', message: 'ID группы не сохранён' });
    }

    const [groupRes, permRes] = await Promise.all([
      fetch('https://api.vk.com/method/groups.getById?' + new URLSearchParams({
        access_token: communityKey,
        group_id: groupId,
        v: '5.199',
      }).toString()).then(r => r.json()).catch(() => ({})),
      fetch('https://api.vk.com/method/groups.getTokenPermissions?' + new URLSearchParams({
        access_token: communityKey,
        v: '5.199',
      }).toString()).then(r => r.json()).catch(() => ({})),
    ]);

    if (groupRes.error) {
      const code = groupRes.error.error_code;
      const msg = groupRes.error.error_msg || 'VK API error';
      if (code === 5) return res.status(400).json({ success: false, error: 'invalid_token', message: 'Ключ недействителен' });
      if (code === 100 || code === 113) return res.status(400).json({ success: false, error: 'group_not_found', message: 'Группа не найдена — проверьте ID' });
      if (code === 27 || code === 214 || code === 15) return res.status(400).json({ success: false, error: 'no_wall_permission', message: 'У ключа нет права «стена»' });
      return res.status(400).json({ success: false, error: 'vk_api_error', message: msg });
    }

    const decoded = decodeVkPermissions(permRes.response || {})
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        vkPermissionMask: mask,
        vkPermissionCheckedAt: new Date(),
      }
    });

    const group = groupRes.response?.[0];
    const groupName = group?.name || '';
    if (groupName) {
      await User.findByIdAndUpdate(req.user.id, { $set: { 'socials.vk.groupName': groupName } });
    }

    const allOk = decoded.permissions.wall && decoded.permissions.photos && decoded.permissions.messages;
    return res.json({
      success: true,
      groupId,
      groupName: groupName || null,
      status: allOk ? 'working' : 'limited',
      permissions: decoded.permissions,
      missing: decoded.missing,
    });
  } catch (err) {
    console.error('[VK test] error:', err.message);
    return res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

// [v9.9.19.15.8] Step-by-step photo upload test (does NOT publish to wall)
router.post('/vk/test-photo', protect, async (req, res) => {
  // [v9.9.19.15.17] kill switch: no VK API calls
  if (!isVkPublishingEnabled()) {
    res.locals.monitoringSkipError = true // [BACKUP-ALERTS-FIX] expected noise, not a server error
    return res.json({ success: false, skipped: true, reason: 'vk_disabled' });
  }

  try {
    const user = await User.findById(req.user.id).select('+vkCommunityKey vkGroupId').lean();
    if (!user?.vkCommunityKey) {
      return res.status(400).json({ success: false, error: 'missing_key', message: 'Ключ сообщества не сохранён' });
    }
    if (!normalizeGroupId(user?.vkGroupId)) {
      return res.status(400).json({ success: false, error: 'invalid_group', message: 'ID группы не сохранён' });
    }

    const testBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 99, g: 102, b: 241 } }
    }).png().toBuffer();

    const steps = [];
    const start = Date.now();

    try {
      const pipeline = await preparePhotoBuffer(testBuffer);
      steps.push({ step: 'pipeline', ok: true, flags: pipeline.flags, ms: Date.now() - start });

      const upload = await uploadPhotoToVK(user, pipeline.buffer);
      steps.push(...upload.steps.map(s => ({ ...s, ok: s.ok })));

      return res.json({ success: true, attachment: upload.attachment, steps });
    } catch (e) {
      const mapped = e?.vkError ? { code: e.vkError.error_code, msg: e.vkError.error_msg } : { msg: e.message };
      steps.push({ step: 'upload', ok: false, ...mapped, ms: Date.now() - start });
      return res.status(400).json({ success: false, error: 'photo_test_failed', steps, message: e.message });
    }
  } catch (err) {
    console.error('[VK test-photo] error:', err.message);
    return res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

// [v9.9.19.15.8] Step-by-step video upload test (does NOT publish to wall)
router.post('/vk/test-video', protect, async (req, res) => {
  // [v9.9.19.15.17] kill switch: no VK API calls
  if (!isVkPublishingEnabled()) {
    res.locals.monitoringSkipError = true // [BACKUP-ALERTS-FIX] expected noise, not a server error
    return res.json({ success: false, skipped: true, reason: 'vk_disabled' });
  }

  try {
    const user = await User.findById(req.user.id).select('+vkCommunityKey vkGroupId').lean();
    if (!user?.vkCommunityKey) {
      return res.status(400).json({ success: false, error: 'missing_key', message: 'Ключ сообщества не сохранён' });
    }
    if (!normalizeGroupId(user?.vkGroupId)) {
      return res.status(400).json({ success: false, error: 'invalid_group', message: 'ID группы не сохранён' });
    }

    const ffmpegPath = await import('ffmpeg-static').then(m => m.default || m.path).catch(() => null);
    if (!ffmpegPath) {
      return res.json({ success: false, error: 'ffmpeg_unavailable', message: 'ffmpeg-static не установлен' });
    }

    const { spawn } = await import('child_process');
    const videoBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const child = spawn(ffmpegPath, [
        '-f', 'lavfi',
        '-i', 'testsrc=size=320x240:rate=1:duration=2',
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=mono',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '64k',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-f', 'mp4',
        'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', c => chunks.push(c));
      child.stderr.on('data', () => {});
      child.on('close', code => {
        if (code !== 0) reject(new Error(`ffmpeg exited ${code}`));
        else resolve(Buffer.concat(chunks));
      });
      child.on('error', reject);
    });

    const steps = [];
    const start = Date.now();

    try {
      const upload = await uploadVideoToVK(user, videoBuffer, { title: 'Test video' });
      steps.push(...upload.steps);
      return res.json({ success: true, attachment: upload.attachment, steps });
    } catch (e) {
      const mapped = e?.vkError ? { code: e.vkError.error_code, msg: e.vkError.error_msg } : { msg: e.message };
      steps.push({ step: 'upload', ok: false, ...mapped, ms: Date.now() - start });
      return res.status(400).json({ success: false, error: 'video_test_failed', steps, message: e.message });
    }
  } catch (err) {
    console.error('[VK test-video] error:', err.message);
    return res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

router.delete('/vk', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'socials.vk': { userId: '', username: '', link: '', enabled: false, scope: [], needsScope: true, communityKey: '', groupId: '', groupName: '' },
        vkToken: '',
        vkRefreshToken: '',
        vkTokenExpiresAt: null,
        vkUserId: '',
        vkCommunityKey: '',
        vkGroupId: '',
        vkConnected: false,
        vkPermissionMask: 0,
        vkPermissionCheckedAt: null,
      }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[VK disconnect] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/vk/publish', protect, async (req, res) => {
  // [v9.9.19.15.17] kill switch: no VK API calls
  if (!isVkPublishingEnabled()) {
    res.locals.monitoringSkipError = true // [BACKUP-ALERTS-FIX] expected noise, not a server error
    return res.json({ success: false, skipped: true, reason: 'vk_disabled' });
  }

  try {
    const { text, link } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'empty_text', hint: 'Добавьте текст поста' });
    }
    const user = await User.findById(req.user.id).select('+vkToken +vkRefreshToken +vkCommunityKey vkGroupId vkConnected vkUserId');
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' });
    }
    const result = await publishToVKWall(user, { text, link, mediaUrl: link });
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
