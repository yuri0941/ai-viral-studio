// [KEYS-UNIVERSAL З3] Роуты универсального слота «Свой провайдер» (owner-only).
// Валидация ЖИВЫМ тест-запросом до сохранения: невалидный → 400 с честной причиной,
// молча не сохраняем. Ключ в ответах всегда маскируется.
import express from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import CustomProvider from '../models/CustomProvider.js'
import { testCustomProvider, invalidateCustomProviderCache } from '../services/customProviderService.js'

const router = express.Router()

const mask = (doc) => ({
    id: String(doc._id),
    name: doc.name,
    baseUrl: doc.baseUrl,
    model: doc.model,
    functions: doc.functions,
    isActive: doc.isActive,
    isValid: doc.isValid,
    status: doc.status,
    lastError: doc.lastError || null,
    lastTestedAt: doc.lastTestedAt || null,
    maskedKey: doc.apiKey ? `${String(doc.apiKey).slice(0, 4)}••••${String(doc.apiKey).slice(-4)}` : null,
})

const cleanText = (v, max) => String(v ?? '').trim().slice(0, max)

// GET /api/custom-providers — список слотов владельца (ключи замаскированы)
router.get('/', protect, requireRole('owner'), async (req, res) => {
    try {
        const ownerId = req.user.id || req.user._id
        const list = await CustomProvider.find({ ownerId }).sort({ createdAt: -1 }).lean()
        res.json({ success: true, providers: list.map(mask) })
    } catch (err) {
        console.error('[CustomProviders] GET error:', err.message)
        res.status(500).json({ success: false, error: 'Не удалось загрузить провайдеров' })
    }
})

// POST /api/custom-providers — создать слот (живая проверка ДО сохранения)
router.post('/', protect, requireRole('owner'), async (req, res) => {
    try {
        const ownerId = req.user.id || req.user._id
        const name = cleanText(req.body?.name, 60)
        const baseUrl = cleanText(req.body?.baseUrl, 300)
        const apiKey = cleanText(req.body?.apiKey, 500)
        const model = cleanText(req.body?.model, 120)
        const functions = Array.isArray(req.body?.functions) && req.body.functions.length
            ? req.body.functions.filter(f => f === 'chat')
            : ['chat']
        if (!name || !baseUrl || !apiKey || !model) {
            return res.status(400).json({ success: false, error: 'Заполните имя, baseURL, ключ и модель' })
        }
        const check = await testCustomProvider({ baseUrl, apiKey, model })
        if (!check.ok) {
            return res.status(400).json({ success: false, error: `Проверка не пройдена: ${check.error}` })
        }
        const doc = await CustomProvider.create({
            ownerId, name, baseUrl: baseUrl.replace(/\/+$/, ''), apiKey, model, functions,
            isActive: true, isValid: true, status: 'active', lastTestedAt: new Date(), lastError: null,
        })
        invalidateCustomProviderCache()
        res.json({ success: true, provider: mask(doc), message: `✅ Провайдер «${name}» подключён и проверен — уже в ротации чата` })
    } catch (err) {
        console.error('[CustomProviders] POST error:', err.message)
        res.status(500).json({ success: false, error: 'Не удалось сохранить провайдера' })
    }
})

// POST /api/custom-providers/:id/test — повторная живая проверка сохранённого слота
router.post('/:id/test', protect, requireRole('owner'), async (req, res) => {
    try {
        const ownerId = req.user.id || req.user._id
        const doc = await CustomProvider.findOne({ _id: req.params.id, ownerId })
        if (!doc) return res.status(404).json({ success: false, error: 'Провайдер не найден' })
        const check = await testCustomProvider(doc)
        doc.isValid = check.ok
        doc.status = check.ok ? 'active' : 'invalid'
        doc.lastError = check.ok ? null : check.error
        doc.lastTestedAt = new Date()
        await doc.save()
        invalidateCustomProviderCache()
        res.json({
            success: check.ok,
            message: check.ok ? '✅ Слот работает' : `❌ ${check.error}`,
            provider: mask(doc),
        })
    } catch (err) {
        console.error('[CustomProviders] TEST error:', err.message)
        res.status(500).json({ success: false, error: 'Проверка недоступна' })
    }
})

// PATCH /api/custom-providers/:id — имя/модель/привязка/вкл-выкл; смена baseURL/ключа → живая проверка
router.patch('/:id', protect, requireRole('owner'), async (req, res) => {
    try {
        const ownerId = req.user.id || req.user._id
        const doc = await CustomProvider.findOne({ _id: req.params.id, ownerId })
        if (!doc) return res.status(404).json({ success: false, error: 'Провайдер не найден' })

        const next = {
            name: req.body?.name !== undefined ? cleanText(req.body.name, 60) : doc.name,
            baseUrl: req.body?.baseUrl !== undefined ? cleanText(req.body.baseUrl, 300) : doc.baseUrl,
            apiKey: req.body?.apiKey !== undefined ? cleanText(req.body.apiKey, 500) : doc.apiKey,
            model: req.body?.model !== undefined ? cleanText(req.body.model, 120) : doc.model,
        }
        if (!next.name) return res.status(400).json({ success: false, error: 'Имя не может быть пустым' })

        const connectionChanged = next.baseUrl !== doc.baseUrl || next.apiKey !== doc.apiKey || next.model !== doc.model
        if (connectionChanged) {
            const check = await testCustomProvider(next)
            if (!check.ok) {
                return res.status(400).json({ success: false, error: `Проверка не пройдена: ${check.error}` })
            }
            next.isValid = true
            next.status = 'active'
            next.lastError = null
            next.lastTestedAt = new Date()
        }
        if (Array.isArray(req.body?.functions)) {
            const fns = req.body.functions.filter(f => f === 'chat')
            if (fns.length) next.functions = fns
        }
        if (req.body?.isActive !== undefined) next.isActive = !!req.body.isActive

        Object.assign(doc, next)
        await doc.save()
        invalidateCustomProviderCache()
        res.json({ success: true, provider: mask(doc), message: '✅ Слот обновлён' })
    } catch (err) {
        console.error('[CustomProviders] PATCH error:', err.message)
        res.status(500).json({ success: false, error: 'Не удалось обновить провайдера' })
    }
})

// DELETE /api/custom-providers/:id — удаление слота без деплоя
router.delete('/:id', protect, requireRole('owner'), async (req, res) => {
    try {
        const ownerId = req.user.id || req.user._id
        const r = await CustomProvider.deleteOne({ _id: req.params.id, ownerId })
        if (!r.deletedCount) return res.status(404).json({ success: false, error: 'Провайдер не найден' })
        invalidateCustomProviderCache()
        res.json({ success: true, message: '🗑 Слот удалён' })
    } catch (err) {
        console.error('[CustomProviders] DELETE error:', err.message)
        res.status(500).json({ success: false, error: 'Не удалось удалить провайдера' })
    }
})

export default router
