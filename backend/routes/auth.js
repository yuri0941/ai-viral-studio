import express from 'express'
import crypto from 'crypto'
import User from '../models/User.js'
import { UsageQuota } from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { sendVerificationEmail, sendPasswordReset } from '../services/emailService.js'
import { verifyTurnstile } from '../middleware/turnstile.js'
import { validateRegister, validateLogin } from '../middleware/validation.js'

const router = express.Router()

const FORBIDDEN_REGISTRATION_ROLES = ['owner', 'admin', 'staff']

// [P22] added: Turnstile verification re-enabled with graceful fallback
router.post('/register', validateRegister, verifyTurnstile, async (req, res) => {
  try {
    // [FIX-BUFFER] рубильник регистрации (OWNER-REMOTE-CONTROL) на ЖИВОМ пути
    const { getOwnerFlags } = await import('../models/OwnerSettings.js')
    const { registrationEnabled } = await getOwnerFlags()
    if (!registrationEnabled) {
      return res.status(403).json({
        success: false,
        code: 'registration_closed',
        message: 'Регистрация временно закрыта. Попробуйте позже.'
      })
    }

    const { name, email, password, acceptedTerms, acceptedPrivacy, acceptedConsent, isAdult, timezone } = req.body

    // [FIX-BUFFER] role из тела ПОЛНОСТЬЮ игнорируется — всегда клиентская роль.
    // Попытка эскалации логируется в AuditLog, регистрация продолжается как обычно.
    if (req.body.role && req.body.role !== 'creator') {
      console.warn('[security] role from register body ignored:', req.body.role, email)
      try {
        const { default: AuditLog } = await import('../models/AuditLog.js')
        await AuditLog.create({
          action: 'security.register_role_attempt',
          user: String(email || 'unknown'),
          type: 'security',
          severity: FORBIDDEN_REGISTRATION_ROLES.includes(req.body.role) ? 'high' : 'medium',
          metadata: { requestedRole: String(req.body.role).slice(0, 40), ip: req.ip },
          timestamp: new Date(),
        })
      } catch (auditErr) {
        console.warn('[security] audit log failed:', auditErr.message)
      }
    }
    const role = 'creator'

    if (!acceptedTerms || !acceptedPrivacy || !acceptedConsent || !isAdult) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо принять все условия: оферту, политику конфиденциальности, согласие на обработку ПДн и подтвердить возраст 18+'
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'creator',
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedConsent: true,
      isAdult: true,
      acceptedAt: new Date(),
      isVerified: false,
      verificationToken: crypto.randomBytes(32).toString('hex'),
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      preferences: {
        timezone: timezone || 'Europe/Moscow',
        voiceSettings: {}
      }
    })

    // [CLIENT-JOURNEY-QA] реферальный код с лендинга (?ref=CODE → localStorage → register body).
    // Раньше код никуда не передавался — рефералка не трекалась при веб-регистрации.
    try {
      const referralCode = String(req.body.referralCode || '').trim().toUpperCase()
      if (referralCode) {
        const { registerReferral } = await import('../services/referralService.js')
        await registerReferral(user._id, referralCode)
      }
    } catch (refErr) {
      console.warn('[auth:register] referral link failed:', refErr.message)
    }

    try {
      await sendVerificationEmail(user.email, user.name, user.verificationToken)
    } catch (emailErr) {
      console.error('[auth:register] verification email failed:', emailErr.message)
    }

    try {
      await UsageQuota.create({
        userId: user._id,
        plan: 'free',
        trialTokens: 10,
        trialUsed: 0,
        generationsLimit: 0,
      })
    } catch (quotaErr) {
      console.error('[auth:register] usage quota creation failed:', quotaErr.message)
    }

    // [FIX-BUFFER] P1.5 signup-метрика на ЖИВОМ пути регистрации (authController.register — мёртвый код, хук там не срабатывал)
    try {
      const { trackSignup } = await import('../services/metricsService.js')
      await trackSignup()
    } catch (mErr) {
      console.warn('[metrics] signup track failed:', mErr.message)
    }

    const token = user.generateToken()

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        avatar: user.avatar,
        preferences: user.preferences,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        acceptedConsent: user.acceptedConsent,
        isAdult: user.isAdult,
        defaultAddAiLabel: user.defaultAddAiLabel,
        isVerified: user.isVerified
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

// [P22] added: Turnstile verification re-enabled with graceful fallback
router.post('/login', validateLogin, verifyTurnstile, async (req, res) => {
  try {
    const { email, password, timezone } = req.body
    console.log('Login attempt:', email)

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Пожалуйста, введите email и пароль' })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' })
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Аккаунт заблокирован' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' })
    }

    user.lastLogin = new Date()
    if (timezone && typeof timezone === 'string' && (!user.preferences?.timezone || user.preferences.timezone !== timezone)) {
      user.preferences = {
        ...(user.preferences || {}),
        timezone,
        voiceSettings: {
          ...(user.preferences?.voiceSettings || {}),
          ...(req.body.preferences?.voiceSettings || {})
        }
      }
    }
    await user.save()

    const token = user.generateToken()

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        subscription: user.subscription,
        preferences: user.preferences,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        acceptedConsent: user.acceptedConsent,
        isAdult: user.isAdult,
        defaultAddAiLabel: user.defaultAddAiLabel,
        isVerified: user.isVerified
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        subscription: user.subscription,
        isActive: user.isActive,
        socialAccounts: user.socialAccounts,
        preferences: user.preferences,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        acceptedConsent: user.acceptedConsent,
        isAdult: user.isAdult,
        defaultAddAiLabel: user.defaultAddAiLabel,
        isVerified: user.isVerified
      }
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ success: false, message: 'Ссылка недействительна или истекла' })
    }

    user.isVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpires = undefined
    await user.save()

    res.json({ success: true, message: 'Email успешно подтверждён' })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

router.post('/send-verification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' })
    }

    user.verificationToken = crypto.randomBytes(32).toString('hex')
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()

    try {
      await sendVerificationEmail(user.email, user.name, user.verificationToken)
    } catch (emailErr) {
      console.error('[auth:send-verification] email failed:', emailErr.message)
    }

    res.json({ success: true, message: 'Письмо отправлено' })
  } catch (error) {
    console.error('Send verification error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email обязателен' })

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ success: true, message: 'Если аккаунт существует, письмо отправлено' })
    }

    user.resetPasswordToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    try {
      await sendPasswordReset(user, user.resetPasswordToken)
    } catch (emailErr) {
      console.error('[auth:forgot-password] email failed:', emailErr.message)
    }

    res.json({ success: true, message: 'Если аккаунт существует, письмо отправлено' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Пароль минимум 6 символов' })
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ success: false, message: 'Ссылка недействительна или истекла' })
    }

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({ success: true, message: 'Пароль успешно изменён' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
})

export default router
