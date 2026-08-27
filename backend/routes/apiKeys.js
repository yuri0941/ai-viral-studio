import express from 'express'
import axios from 'axios'
import { protect, requireRole } from '../middleware/auth.js'
import { ApiKey } from '../models/index.js'
import { hotReloadApiKey } from '../services/aiService.js'
import { getOwnerKeyScope } from '../utils/keyScope.js'

const router = express.Router()

// GET /api/api-keys — list saved keys (masked value only)
router.get('/', protect, requireRole('owner'), async (req, res) => {
  try {
    const scope = getOwnerKeyScope(req)
    const keys = await ApiKey.find(scope).lean()
    const masked = keys.map(k => ({
      ...k,
      key: undefined,
      keyValue: undefined,
      maskedKey: k.key ? `${String(k.key).slice(0, 6)}••••${String(k.key).slice(-4)}` : null,
    }))
    res.json({ success: true, keys: masked })
  } catch (err) {
    console.error('[ApiKeys] GET error:', err.message)
    res.json({ success: false, keys: [], error: 'Не удалось загрузить ключи' })
  }
})

// POST /api/api-keys — save/update key + hot-reload
router.post('/', protect, requireRole('owner'), async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id
    if (!ownerId) {
      return res.status(400).json({ success: false, error: 'Owner not resolved' })
    }
    const scope = getOwnerKeyScope(req)
    const { provider } = req.body
    const rawKey = req.body?.key
    if (!provider || rawKey === undefined || rawKey === null || rawKey === '') {
      return res.status(400).json({ success: false, error: 'Provider and key required' })
    }

    const key = String(rawKey).trim()
    if (!key) {
      return res.status(400).json({ success: false, error: 'Ключ пустой после удаления пробелов — проверьте вставку' })
    }

    const formatCheck = checkKeyFormat(provider, key)
    if (!formatCheck.ok) {
      return res.status(400).json({ success: false, error: formatCheck.error })
    }
    const validation = await validateApiKey(provider, key)
    if (formatCheck.warning && !validation.error) {
      validation.warning = formatCheck.warning
    }

    // [v9.9.19.14.6] unified scope: finds owned keys AND orphan legacy keys.
    // upsert by provider within the owner's scope — never duplicates because of
    // the { ownerId, provider } unique index once orphan keys are repaired.
    const apiKey = await ApiKey.findOneAndUpdate(
      { ...scope, provider },
      {
        ownerId,
        provider,
        key,
        keyValue: key,
        isValid: validation.valid,
        isActive: true,
        status: validation.valid ? 'active' : 'invalid',
        lastError: validation.error || null,
        lastRotated: new Date()
      },
      { upsert: true, new: true }
    )

    hotReloadApiKey(provider, key)

    // [OWNER-OMEGA] токены ботов: hot-reload живого инстанса + переустановка webhook (deleteWebhook → setWebhook)
    let botReload = null
    if (provider === 'telegram_bot' || provider === 'telegram_owner_bot') {
      try {
        const { reloadBotToken } = await import('../services/botReloader.js')
        botReload = await reloadBotToken(provider, key)
      } catch (e) {
        console.error('[ApiKeys] bot reload failed:', e.message)
        botReload = { ok: false, reason: 'exception', message: e.message }
      }
    }

    let message
    if (validation.valid) {
      message = validation.warning ? `⚠️ ${validation.warning}` : '✅ Ключ сохранён и проверен'
    } else if (validation.warning) {
      message = `⚠️ ${validation.warning}`
    } else if (validation.error) {
      message = `❌ Ключ сохранён, но проверка не пройдена: ${validation.error}`
    } else {
      message = '❌ Ключ сохранён, но проверка не пройдена'
    }
    if (botReload) message += botReload.ok ? ` · 🤖 ${botReload.message}` : ` · ⚠️ Переподключение бота: ${botReload.message || botReload.reason}`
    res.json({
      success: true,
      provider,
      isValid: validation.valid,
      ok: validation.valid,
      warning: validation.warning || null,
      botReload,
      message
    })
  } catch (err) {
    console.error('[ApiKeys] POST error:', err.message)
    res.json({ success: false, error: 'Не удалось сохранить ключ' })
  }
})

// DELETE /api/api-keys/:provider
router.delete('/:provider', protect, requireRole('owner'), async (req, res) => {
  try {
    const scope = getOwnerKeyScope(req)
    await ApiKey.deleteOne({ ...scope, provider: req.params.provider })
    if (global.apiKeyCache) delete global.apiKeyCache[req.params.provider]
    res.json({ success: true, message: 'Ключ удалён' })
  } catch (err) {
    console.error('[ApiKeys] DELETE error:', err.message)
    res.json({ success: false, error: 'Не удалось удалить ключ' })
  }
})

// POST /api/api-keys/test — test key without saving
router.post('/test', protect, requireRole('owner'), async (req, res) => {
  try {
    const { provider } = req.body
    const rawKey = req.body?.key
    if (!provider || rawKey === undefined || rawKey === null || rawKey === '') {
      return res.status(400).json({ success: false, error: 'Provider and key required' })
    }
    const key = String(rawKey).trim()
    if (!key) {
      return res.status(400).json({ success: false, error: 'Ключ пустой после удаления пробелов — проверьте вставку' })
    }
    const formatCheck = checkKeyFormat(provider, key)
    if (!formatCheck.ok) {
      return res.status(400).json({ success: false, error: formatCheck.error })
    }
    const result = await validateApiKey(provider, key)
    if (formatCheck.warning && result.valid) result.warning = formatCheck.warning
    const message = result.valid
      ? (result.warning ? `✅ Ключ работает (${result.warning})` : '✅ Ключ работает')
      : `❌ ${result.status ? `HTTP ${result.status}: ` : ''}${result.error || 'проверка не пройдена'}`
    res.json({ success: result.valid, ok: result.valid, message, ...result })
  } catch (err) {
    console.error('[ApiKeys] TEST error:', err.message)
    res.json({ success: false, ok: false, message: '❌ Проверка недоступна' })
  }
})

function checkKeyFormat(provider, key) {
  const trimmed = String(key).trim()
  if (trimmed !== String(key)) {
    return { ok: true, warning: 'Пробелы по краям были удалены перед сохранением' }
  }
  if (provider === 'yookassa_shop_id') {
    if (!/^\d{4,8}$/.test(trimmed)) {
      return { ok: true, warning: 'ID магазина — обычно 6 цифр из кабинета ЮKassa → Настройки → shopId' }
    }
  }
  if (provider === 'yookassa_secret') {
    if (!/^(test|live)[A-Za-z0-9_]{10,}$/.test(trimmed)) {
      return { ok: true, warning: 'Секретный ключ должен начинаться с test_ или live_ (ЮKassa → Интеграция → API)' }
    }
  }
  if (provider === 'telegram_bot' || provider === 'telegram_owner_bot') {
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(trimmed)) {
      return { ok: true, warning: 'Bot Token выглядит как 123456:ABC-DEF... из @BotFather' }
    }
  }
  if (provider === 'telegram_channel') {
    if (!/^@?[A-Za-z0-9_]{5,64}$/.test(trimmed) && !/^-?\d{5,20}$/.test(trimmed)) {
      return { ok: true, warning: 'Канал выглядит как @username или числовой ID (-100...)' }
    }
  }
  if (provider === 'youtube_oauth') {
    if (!/\.apps\.googleusercontent\.com$/.test(trimmed)) {
      return { ok: false, error: 'invalid_client_id_format' }
    }
  }
  if (provider === 'youtube_secret') {
    if (trimmed.length < 1) {
      return { ok: false, error: 'youtube_secret_empty' }
    }
  }
  return { ok: true }
}

async function validateApiKey(provider, key) {
  try {
    switch (provider) {
      case 'groq': {
        const r = await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'openrouter': {
        const r = await axios.get('https://openrouter.ai/api/v1/auth/key', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'openai': {
        const r = await axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'deepseek': {
        const r = await axios.get('https://api.deepseek.com/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'cerebras': {
        const r = await axios.get('https://api.cerebras.ai/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'together': {
        const r = await axios.get('https://api.together.xyz/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'fireworks': {
        const r = await axios.get('https://api.fireworks.ai/inference/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'mistral': {
        const r = await axios.get('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'cohere': {
        const r = await axios.get('https://api.cohere.ai/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'gemini': {
        const r = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'elevenlabs': {
        const r = await axios.get('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'youtube': {
        // [YT-DATA-REAL-STATS] YouTube Data API key (AIza...) — это НЕ OAuth access token.
        // Раньше валидация слала ключ как access_token с mine=true → Google отвечал 401
        // и валидный ключ отклонялся. Дешёвая проверка: videos.list?part=id (1 ед. квоты).
        const r = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: { part: 'id', id: 'dQw4w9WgXcQ', maxResults: 1, key },
          timeout: 10000,
        })
        return { valid: r.status === 200 && Array.isArray(r.data?.items), provider }
      }
      case 'replicate': {
        const r = await axios.get('https://api.replicate.com/v1/models', { headers: { Authorization: `Token ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'serpapi': {
        const r = await axios.get(`https://serpapi.com/search?q=test&api_key=${key}`, { timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'telegram_bot':
      case 'telegram_owner_bot': {
        const r = await axios.get(`https://api.telegram.org/bot${key}/getMe`, { timeout: 10000 })
        return { valid: r.data?.ok === true, provider, botName: r.data?.result?.username }
      }
      case 'telegram_chat_id': {
        return { valid: /^-?\d+$/.test(String(key).trim()), provider, error: /^-?\d+$/.test(String(key).trim()) ? undefined : 'Chat ID должен быть числом' }
      }
      case 'telegram_channel': {
        // [OWNER-OMEGA] username канала (@name) или числовой ID; онлайн-проверка — через публикацию
        const v = String(key).trim()
        const ok = /^@?[A-Za-z0-9_]{5,64}$/.test(v) || /^-?\d{5,20}$/.test(v)
        return { valid: ok, provider, error: ok ? undefined : 'Канал: @username или числовой ID' }
      }
      case 'stripe': {
        const r = await axios.get('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 })
        return { valid: r.status === 200, provider }
      }
      case 'yookassa_shop_id':
      case 'yookassa_secret':
      case 'paypal_client_id':
      case 'paypal_secret':
      case 'vapid_public':
      case 'vapid_private':
      case 'smtp_host':
      case 'smtp_user':
      case 'smtp_pass':
      case 'vk':
      case 'vk_secret':
      case 'youtube_oauth':
      case 'youtube_secret': {
        // [v9.9.19.14.5] no safe ping endpoint — mark as saved, not working; real check is via 🧪 button
        return { valid: false, provider, warning: 'Ключ сохранён. Реальная проверка — через 🧪 Проверить' }
      }
      default:
        return { valid: true, provider, warning: 'No online validation, assuming valid' }
    }
  } catch (e) {
    const status = e.response?.status
    let message = e.response?.data?.error?.message || e.response?.data?.message || e.message
    // [YT-DATA-REAL-STATS] человеческие причины от Google для YouTube Data API ключа
    if (provider === 'youtube') {
      const reasons = (e.response?.data?.error?.errors || []).map(x => x?.reason).filter(Boolean)
      const reason = reasons[0] || ''
      if (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(message)) {
        message = 'YouTube Data API v3 не включён в проекте — включите его: https://console.cloud.google.com/apis/library/youtube.googleapis.com'
      } else if (reason === 'keyInvalid' || status === 400) {
        message = 'Ключ недействителен — проверьте его в Google Cloud → Credentials'
      } else if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        message = 'Дневная квота YouTube API исчерпана — сброс после 10:00 МСК'
      } else if (reason === 'ipRefererBlocked' || reason === 'forbidden' || status === 403) {
        message = 'Ключ заблокирован ограничениями — в Google Cloud → Credentials снимите ограничения (Application restrictions → None)'
      }
      return { valid: false, provider, error: message, status, reason }
    }
    return { valid: false, provider, error: message, status }
  }
}

export default router
