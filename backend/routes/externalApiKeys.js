import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import ExternalApiKey from '../models/ExternalApiKey.js';
import { reloadApiKeys, getApiKey } from '../services/runtimeConfig.js';

const router = Router();

// GET /api/admin/external-keys — список всех (маскированные)
router.get('/', protect, requireRole('owner','admin'), async (req, res) => {
  try {
    const keys = await ExternalApiKey.find().sort({ provider: 1 });
    res.json({
      success: true,
      data: keys.map(k => ({
        provider: k.provider,
        isActive: k.isActive,
        lastVerifiedAt: k.lastVerifiedAt,
        lastError: k.lastError,
        hasKey: !!k.encryptedKey,
        maskedKey: k.encryptedKey ? '••••••••' + k.encryptedKey.slice(-4) : null
      }))
    });
  } catch (err) {
    console.error('[externalApiKeys:list]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/external-keys/:provider — сохранить + проверить
router.post('/:provider', protect, requireRole('owner','admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    const { key } = req.body;
    if (!key || key.length < 10) return res.status(400).json({ success: false, error: 'Invalid key' });

    const validProviders = ['replicate','elevenlabs','openai_whisper','openai'];
    if (!validProviders.includes(provider)) return res.status(400).json({ success: false, error: 'Unknown provider' });

    // Test key before saving
    let testResult = { success: false, message: 'Not tested' };
    try {
      if (provider === 'replicate') {
        const r = await fetch('https://api.replicate.com/v1/models', { headers: { 'Authorization': `Token ${key}` } });
        testResult = { success: r.status === 200, status: r.status };
      } else if (provider === 'elevenlabs') {
        const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
        testResult = { success: r.status === 200, status: r.status };
      } else if (provider === 'openai' || provider === 'openai_whisper') {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        testResult = { success: r.status === 200, status: r.status };
      }
    } catch(e) { testResult = { success: false, error: e.message }; }

    if (!testResult.success) {
      return res.status(400).json({ success: false, error: 'Key validation failed', details: testResult });
    }

    await ExternalApiKey.setKey(provider, key);
    await reloadApiKeys();

    res.json({ success: true, provider, verified: true, message: 'Key saved and activated' });
  } catch (err) {
    console.error('[externalApiKeys:save]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/external-keys/:provider — удалить
router.delete('/:provider', protect, requireRole('owner','admin'), async (req, res) => {
  try {
    await ExternalApiKey.findOneAndUpdate({ provider: req.params.provider }, { isActive: false });
    await reloadApiKeys();
    res.json({ success: true, message: 'Key deactivated' });
  } catch (err) {
    console.error('[externalApiKeys:delete]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
