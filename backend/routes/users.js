import express from 'express'
import { protect } from '../middleware/auth.js'
import { getMe, updateMe, changePassword, changeEmail, deleteMyData, exportMyData } from '../controllers/userController.js'
import { applyWatermarkToImage, canDisableWatermark } from '../services/watermarkService.js'
import { checkQuota } from '../services/usageQuotaService.js'
import { UsageQuota } from '../models/index.js'
import User from '../models/User.js'

const router = express.Router()

router.get('/me', protect, getMe)
router.put('/me', protect, updateMe)
router.patch('/me', protect, updateMe)
// [P16-FIX] added
router.patch('/me/socials', protect, async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { socials: req.body.socials } })
    res.json({ success: true })
})

// [P20] added: watermark preview
router.post('/me/watermark-preview', protect, async (req, res) => {
    try {
        const { imageUrl, settings } = req.body || {}
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'imageUrl is required' })
        }
        const user = await User.findById(req.user.id)
        const mergedSettings = {
            ...((user?.watermarkSettings) || {}),
            ...(settings || {}),
        }
        const result = await applyWatermarkToImage(imageUrl, mergedSettings)
        res.json({ success: result.success, data: result })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// [P20] added: watermark eligibility check
router.get('/me/watermark-eligibility', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        res.json({
            success: true,
            canDisable: canDisableWatermark(user),
            note: 'Отключение водяного знака доступно для Pro+ ($10/мес) или Enterprise.'
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// [P24] fixed: avatar upload endpoint
router.patch('/me/avatar', protect, async (req, res) => {
    try {
        const { avatar } = req.body || {}
        if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
            return res.status(400).json({ success: false, message: 'Avatar must be a base64 image' })
        }
        // 2MB limit for base64 string length approximation
        if (avatar.length > 2.8e6) {
            return res.status(413).json({ success: false, message: 'Avatar image exceeds 2MB limit' })
        }
        const user = await User.findByIdAndUpdate(req.user._id || req.user.id, { avatar }, { new: true }).select('avatar')
        res.json({ success: true, avatar: user.avatar })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

// [v6.5.5] onboarding progress sync
router.patch('/me/onboarding', protect, async (req, res) => {
    try {
        const { step, data, completed } = req.body || {}
        const user = await User.findById(req.user._id || req.user.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        const preferences = user.preferences || {}
        preferences.onboarding = {
            step: typeof step === 'number' ? step : (preferences.onboarding?.step ?? 0),
            data: data || preferences.onboarding?.data || {},
            completed: typeof completed === 'boolean' ? completed : (preferences.onboarding?.completed ?? false),
            updatedAt: new Date(),
        }
        user.preferences = preferences
        await user.save()
        res.json({ success: true, preferences: user.preferences })
    } catch (err) {
        console.error('[users/me/onboarding]', err.message)
        res.status(500).json({ success: false, message: err.message })
    }
})

router.post('/change-password', protect, changePassword)
router.post('/change-email', protect, changeEmail)
router.delete('/me/data', protect, deleteMyData)
router.get('/me/export', protect, exportMyData)

// [MONETIZE-2026-08-04] added: current usage quota
router.get('/me/quota', protect, async (req, res) => {
    try {
        const quota = await checkQuota(req.user._id || req.user.id)
        const quotaDoc = await UsageQuota.findOne({ userId: req.user._id || req.user.id }).lean()
        res.json({
            status: 'success',
            data: {
                generationsUsed: quota.used,
                generationsLimit: quota.limit,
                remaining: quota.remaining,
                plan: quota.plan,
                cycleEndsAt: quota.cycleEndsAt,
                trialTokens: quotaDoc?.trialTokens ?? 0,
                trialUsed: quotaDoc?.trialUsed ?? 0,
            }
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/profile', (req, res) => {
    res.json({ status: 'success', message: 'User profile' })
})

// [v9.9.19-MASTER-AUDIT] клиентский Telegram Connect: статус + deep-link для привязки
router.get('/telegram-status', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('telegramId telegramUsername telegramChatId').lean()
        const userId = String(req.user._id || req.user.id)
        res.json({
            success: true,
            connected: !!user?.telegramId,
            telegramId: user?.telegramId || null,
            telegramUsername: user?.telegramUsername || null,
            botLink: `https://t.me/aiviral_omega_bot?start=${userId}`
        })
    } catch (err) {
        console.error('[users/telegram-status]', err.message)
        res.json({ success: true, connected: false, botLink: 'https://t.me/aiviral_omega_bot' })
    }
})

router.put('/profile', (req, res) => {
    res.json({ status: 'success', message: 'Update profile' })
})

export default router
