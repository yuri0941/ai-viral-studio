import express from 'express'
import axios from 'axios'
import { protect, requireRole } from '../middleware/auth.js'
import { ApiKey } from '../models/index.js'
import { hotReloadApiKey } from '../services/aiService.js'

const router = express.Router()

// GET /api/api-keys — list saved keys (without value)
router.get('/', protect, requireRole('owner'), async (req, res) => {
  try {
    const keys = await ApiKey.find({ ownerId: req.user._id }).select('-key -keyValue').lean()
    res.json({ success: true, keys })
  } catch (err) {
    console.error('[ApiKeys] GET error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/api-keys — save/update key + hot-reload
router.post('/', protect, requireRole('owner'), async (req, res) => {
  try {
    const { provider, key } = req.body
    if (!provider || !key) {
      return res.status(400).json({ success: false, error: 'Provider and key required' })
    }

    const validation = await validateApiKey(provider, key)

    const apiKey = await ApiKey.findOneAndUpdate(
      { ownerId: req.user._id, provider },
      {
        ownerId: req.user._id,
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

    res.json({
      success: true,
      provider,
      isValid: validation.valid,
      message: validation.valid
        ? '✅ Ключ сохранён и активирован!'
        : `⚠️ Ключ сохранён, но проверка не пройдена: ${validation.error}`
    })
  } catch (err) {
    console.error('[ApiKeys] POST error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/api-keys/:provider
router.delete('/:provider', protect, requireRole('owner'), async (req, res) => {
  try {
    await ApiKey.deleteOne({ ownerId: req.user._id, provider: req.params.provider })
    if (global.apiKeyCache) delete global.apiKeyCache[req.params.provider]
    res.json({ success: true, message: 'Ключ удалён' })
  } catch (err) {
    console.error('[ApiKeys] DELETE error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/api-keys/test — test key without saving
router.post('/test', protect, requireRole('owner'), async (req, res) => {
  try {
    const { provider, key } = req.body
    if (!provider || !key) {
      return res.status(400).json({ success: false, error: 'Provider and key required' })
    }
    const result = await validateApiKey(provider, key)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[ApiKeys] TEST error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

async function validateApiKey(provider, key) {
  try {
    switch (provider) {
      case 'groq': {
        const r = await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'openrouter': {
        const r = await axios.get('https://openrouter.ai/api/v1/auth/key', { headers: { Authorization: `Bearer ${key}` }, timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'openai': {
        const r = await axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` }, timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'gemini': {
        const r = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'elevenlabs': {
        const r = await axios.get('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key }, timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'youtube': {
        const r = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&access_token=${key}`, { timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'replicate': {
        const r = await axios.get('https://api.replicate.com/v1/models', { headers: { Authorization: `Token ${key}` }, timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      case 'serpapi': {
        const r = await axios.get(`https://serpapi.com/search?q=test&api_key=${key}`, { timeout: 5000 })
        return { valid: r.status === 200, provider }
      }
      default:
        return { valid: true, provider, warning: 'No online validation, assuming valid' }
    }
  } catch (e) {
    return { valid: false, provider, error: e.response?.data?.error?.message || e.message }
  }
}

export default router
