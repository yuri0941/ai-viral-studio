import express from 'express'
import crypto from 'crypto'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'
import { sendVerificationEmail, sendPasswordReset } from '../services/emailService.js'
import { verifyTurnstile } from '../middleware/turnstile.js'
import { validateRegister, validateLogin } from '../middleware/validation.js'

const router = express.Router()

const FORBIDDEN_REGISTRATION_ROLES = ['owner', 'admin', 'staff']

router.post('/register', validateRegister, verifyTurnstile, async (req, res) => {
  try {
    const { name, email, password, acceptedTerms, acceptedPrivacy, acceptedConsent, isAdult, timezone } = req.body

    // Security: clients cannot self-register privileged roles
    if (FORBIDDEN_REGISTRATION_ROLES.includes(req.body.role)) {
      console.warn('[security] attempt to register privileged role:', req.body.role)
      return res.status(403).json({ success: false, message: 'Forbidden role' })
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
      preferences: { timezone: timezone || 'Europe/Moscow' }
    })

    try {
      await sendVerificationEmail(user.email, user.name, user.verificationToken)
    } catch (emailErr) {
      console.error('[auth:register] verification email failed:', emailErr.message)
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
      user.preferences = { ...user.preferences, timezone }
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
