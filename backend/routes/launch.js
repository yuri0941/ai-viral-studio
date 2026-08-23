import express from 'express'
import crypto from 'crypto'
import { Waitlist, User } from '../models/index.js'

const router = express.Router()

const REFERRAL_POINTS = 50
const TELEGRAM_POINTS = 20
const TIKTOK_POINTS = 15

function generateReferralCode() {
    return 'OMEGA' + crypto.randomBytes(3).toString('hex').toUpperCase()
}

// POST /api/launch/waitlist — добавление в waitlist
router.post('/waitlist', async (req, res) => {
    try {
        const {
            email,
            niche = '',
            businessSize = '',
            source = 'landing',
            referredBy = '',
            utm = {},
        } = req.body

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required' })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const existing = await Waitlist.findOne({ email: normalizedEmail })

        if (existing) {
            const position = await existing.calculatePosition()
            return res.json({
                success: true,
                data: existing,
                total: await Waitlist.countDocuments(),
                position,
                referralCode: existing.referralCode,
                alreadyRegistered: true,
            })
        }

        let points = 0
        if (referredBy && /^OMEGA[A-F0-9]{6}$/i.test(referredBy)) {
            const referrer = await Waitlist.findOne({ referralCode: referredBy.toUpperCase() })
            if (referrer) {
                referrer.points += REFERRAL_POINTS
                await referrer.save()
                points += REFERRAL_POINTS / 2 // реферал получает половину бонуса
            }
        }

        const entry = new Waitlist({
            email: normalizedEmail,
            niche,
            businessSize,
            source,
            referredBy: referredBy ? referredBy.toUpperCase() : '',
            utm,
            points,
            referralCode: generateReferralCode(),
        })

        await entry.save()
        const position = await entry.calculatePosition()
        entry.position = position
        await entry.save()

        // пересчитать позиции для топ-100
        const topEntries = await Waitlist.find().sort({ points: -1, createdAt: 1 }).limit(100)
        await Promise.all(topEntries.map((e, idx) => {
            e.position = idx + 1
            e.badge = idx < 100 ? 'founding_member' : ''
            return e.save()
        }))

        const finalPosition = await entry.calculatePosition()
        entry.position = finalPosition
        entry.isFoundingMember = finalPosition <= 100
        entry.foundingMemberRank = finalPosition <= 100 ? finalPosition : undefined
        entry.foundingMemberBadge = finalPosition <= 100 ? (finalPosition <= 10 ? '🥇 Top 10' : finalPosition <= 50 ? '🥈 Top 50' : '🥉 Top 100') : undefined
        await entry.save()

        const count = await Waitlist.countDocuments()
        res.json({
            success: true,
            data: entry,
            total: count,
            position: finalPosition,
            referralCode: entry.referralCode,
            isFoundingMember: entry.isFoundingMember,
            foundingMemberRank: entry.foundingMemberRank,
            foundingMemberBadge: entry.foundingMemberBadge,
        })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Email already registered' })
        }
        res.status(500).json({ success: false, message: err.message })
    }
})

// GET /api/launch/waitlist/count — количество в очереди
router.get('/waitlist/count', async (req, res) => {
    try {
        const count = await Waitlist.countDocuments()
        res.json({ success: true, data: { count } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// GET /api/launch/waitlist/position/:email — позиция в очереди
router.get('/waitlist/position/:email', async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email).toLowerCase().trim()
        const entry = await Waitlist.findOne({ email })
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Not found' })
        }
        const position = await entry.calculatePosition()
        res.json({ success: true, data: { position, points: entry.points, badge: entry.badge } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/launch/waitlist/referral — применение реферального кода (+50 points)
router.post('/waitlist/referral', async (req, res) => {
    try {
        const { email, referralCode } = req.body
        if (!email || !referralCode) {
            return res.status(400).json({ success: false, message: 'Email and referralCode are required' })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const entry = await Waitlist.findOne({ email: normalizedEmail })
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Email not found in waitlist' })
        }

        if (entry.referredBy) {
            return res.status(409).json({ success: false, message: 'Referral code already applied' })
        }

        const referrer = await Waitlist.findOne({ referralCode: referralCode.toUpperCase() })
        if (!referrer) {
            return res.status(404).json({ success: false, message: 'Referral code not found' })
        }
        if (referrer.email === normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Cannot refer yourself' })
        }

        entry.referredBy = referralCode.toUpperCase()
        entry.points += REFERRAL_POINTS
        await entry.save()

        referrer.points += REFERRAL_POINTS
        await referrer.save()

        const position = await entry.calculatePosition()
        res.json({ success: true, data: { position, points: entry.points, badge: entry.badge } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/launch/waitlist/boost — начисление бонусных баллов (Telegram, TikTok)
router.post('/waitlist/boost', async (req, res) => {
    try {
        const { email, action } = req.body
        if (!email || !['telegram', 'tiktok'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Email and valid action required' })
        }

        const entry = await Waitlist.findOne({ email: email.toLowerCase().trim() })
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Email not found' })
        }

        const boostKey = `boost_${action}_at`
        if (entry[boostKey]) {
            return res.status(409).json({ success: false, message: 'Boost already applied' })
        }

        const points = action === 'telegram' ? TELEGRAM_POINTS : TIKTOK_POINTS
        entry.points += points
        entry[boostKey] = new Date()
        await entry.save()

        const position = await entry.calculatePosition()
        res.json({ success: true, data: { position, points: entry.points, action } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// GET /api/launch/waitlist/founding-members — первые 100 (анонимно)
router.get('/waitlist/founding-members', async (req, res) => {
    try {
        const members = await Waitlist.find({ isFoundingMember: true })
            .sort({ foundingMemberRank: 1 })
            .limit(100)
            .select('foundingMemberRank foundingMemberBadge createdAt -_id')
            .lean()
        const anonymized = members.map(m => ({
            rank: m.foundingMemberRank,
            badge: m.foundingMemberBadge,
            initials: 'FM',
            joinedAt: m.createdAt,
        }))
        res.json({ success: true, data: { members: anonymized } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// GET /api/launch/beta/slots — оставшиеся founding-слоты
// [P1.6-PREP] слот = первая УСПЕШНАЯ оплата (FoundingSlot), не регистрация; активность скидки — из БД, без деплоя
router.get('/beta/slots', async (req, res) => {
    try {
        const { getFoundingStats } = await import('../services/foundingService.js')
        const stats = await getFoundingStats()
        res.json({
            success: true,
            data: {
                total: stats.total,
                used: stats.used,
                remaining: stats.remaining,
                foundingActive: stats.active,
                discountPercent: stats.discountPercent, // [PLANCONFIG-ADMIN] из FoundingConfig (БД)
                nextWaveInDays: 0,
            },
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
