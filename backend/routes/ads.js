import express from 'express'
import { Campaign } from '../models/Campaign.js'
import { chatWithAI } from '../services/aiService.js'

const router = express.Router()

function requireOwner(req, res, next) {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({ status: 'error', message: 'Only owner' })
    }
    next()
}

router.post('/create', async (req, res) => {
    try {
        const { name, client, budget, platform, goal, audience, creativeText, cta, budgetType, startDate, endDate } = req.body
        if (!name || !client || !budget) {
            return res.status(400).json({ status: 'error', message: 'name, client, budget required' })
        }
        const userId = req.user?._id || req.user?.id
        const campaign = await Campaign.create({
            name,
            client,
            clientId: userId,
            ownerId: userId,
            budget: Number(budget) || 0,
            status: 'pending_review',
            platform,
            startDate,
            endDate,
            metadata: { goal, audience, creativeText, cta, budgetType },
        })
        res.status(201).json({ status: 'success', data: campaign })
    } catch (err) {
        console.error('[ads:create]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/campaigns', async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const campaigns = await Campaign.find({ $or: [{ ownerId: userId }, { clientId: userId }] })
            .sort({ createdAt: -1 })
            .lean()
        res.json({ status: 'success', data: campaigns })
    } catch (err) {
        console.error('[ads:campaigns]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/generate-variants', async (req, res) => {
    try {
        const { product, audience, platform, count = 3, lang = 'ru' } = req.body
        const n = Math.min(10, Math.max(1, Number(count) || 3))
        const prompt = `Сгенерируй ${n} варианта рекламного креатива${product ? ' для продукта: ' + product : ''}${audience ? ', аудитория: ' + audience : ''}${platform ? ', площадка: ' + platform : ''}. Для каждого варианта укажи: заголовок, основной текст, CTA, целевая аудитория, прогноз CTR (%), прогноз engagement (%). Верни результат в виде markdown-таблицы.`
        const result = await chatWithAI(prompt, [], lang, {
            userRole: req.user?.role || 'advertiser',
            userId: req.user?._id || req.user?.id,
        })
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[ads:generate-variants]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/analyze-competitor', async (req, res) => {
    try {
        const { url, niche = '', lang = 'ru' } = req.body
        if (!url) return res.status(400).json({ status: 'error', message: 'url required' })
        const prompt = `Проанализируй рекламу конкурента по URL: ${url}. Ниша: ${niche || 'не указана'}. Оцени: сильные стороны, слабые стороны, целевую аудиторию, оффер, CTA, креатив, что можно перенять. Дай рекомендации по улучшению.`
        const result = await chatWithAI(prompt, [], lang, {
            userRole: req.user?.role || 'advertiser',
            userId: req.user?._id || req.user?.id,
        })
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[ads:analyze-competitor]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/:id/approve', requireOwner, async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
        if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' })
        res.json({ status: 'success', data: campaign })
    } catch (err) {
        console.error('[ads:approve]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/:id/reject', requireOwner, async (req, res) => {
    try {
        const { reason } = req.body
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true })
        if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' })
        res.json({ status: 'success', data: campaign, reason })
    } catch (err) {
        console.error('[ads:reject]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/:id/launch', requireOwner, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
        if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' })
        if (campaign.status !== 'approved') {
            return res.status(400).json({ status: 'error', message: 'Campaign must be approved before launch' })
        }
        campaign.status = 'active'
        await campaign.save()
        res.json({ status: 'success', data: campaign })
    } catch (err) {
        console.error('[ads:launch]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
