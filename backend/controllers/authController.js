import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { sendVerificationEmail } from '../services/emailService.js'
import { alertOwner } from '../services/ownerBot.js'
import { registerReferral } from '../services/referralService.js'

// Generate tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    )

    return { accessToken, refreshToken }
}

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        // [OWNER-REMOTE-CONTROL] рубильник регистрации (OwnerSettings, hot-reload ≤60 сек)
        const { getOwnerFlags } = await import('../models/OwnerSettings.js')
        const { registrationEnabled } = await getOwnerFlags()
        if (!registrationEnabled) {
            return res.status(403).json({
                status: 'error',
                code: 'registration_closed',
                message: 'Регистрация временно закрыта. Попробуйте позже.'
            })
        }

        const { email, password, name, role, acceptedTerms, acceptedPrivacy, acceptedConsent, isAdult, timezone } = req.body

        if (!acceptedTerms || !acceptedPrivacy || !acceptedConsent || !isAdult) {
            return res.status(400).json({
                status: 'error',
                message: 'Необходимо принять все условия: оферту, политику конфиденциальности, согласие на обработку ПДн и подтвердить возраст 18+'
            })
        }

        // Check if user exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email already exists'
            })
        }

        // [HOTFIX-v7.0-CHAT] owner gets Agency unlimited
        const effectiveRole = role || 'creator'
        const isOwnerRole = effectiveRole === 'owner'

        // Create user
        const user = await User.create({
            email,
            password,
            name,
            role: effectiveRole,
            subscription: isOwnerRole ? 'agency' : undefined,
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

        // Send verification email
        try {
            await sendVerificationEmail(user.email, user.name, user.verificationToken, user.preferences?.language || 'ru')
        } catch (emailErr) {
            console.error('[authController:register] verification email failed:', emailErr.message)
        }

        // Apply referral code if provided
        if (req.body.referralCode) {
            try {
                await registerReferral(user._id, req.body.referralCode)
            } catch (refErr) {
                console.warn('[authController:register] referral apply failed:', refErr.message)
            }
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id)

        alertOwner(`🎉 Новый пользователь!\n📧 ${user.email}\n👤 ${user.name || '—'}`)
            .catch(() => {})

        // [P1.5-METRICS] signup — метрика никогда не валит регистрацию
        try {
            const { trackSignup } = await import('../services/metricsService.js')
            await trackSignup()
        } catch (mErr) {
            console.warn('[metrics] signup track failed:', mErr.message)
        }

        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription: user.subscription,
                    preferences: user.preferences,
                    acceptedTerms: user.acceptedTerms,
                    acceptedPrivacy: user.acceptedPrivacy,
                    acceptedConsent: user.acceptedConsent,
                    isAdult: user.isAdult,
                    defaultAddAiLabel: user.defaultAddAiLabel,
                    isVerified: user.isVerified
                },
                accessToken,
                refreshToken
            }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password, timezone } = req.body

        // Check if user exists
        const user = await User.findOne({ email }).select('+password')
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            })
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                status: 'error',
                message: 'Account is deactivated'
            })
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password)
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            })
        }

        // Update last login and timezone if provided
        user.lastLogin = new Date()
        if (timezone && typeof timezone === 'string' && (!user.preferences?.timezone || user.preferences.timezone !== timezone)) {
            user.preferences = { ...user.preferences, timezone }
        }
        // [HOTFIX-v7.0-CHAT] ensure owner is Agency unlimited
        if (user.role === 'owner' && user.subscription !== 'agency') {
            user.subscription = 'agency'
        }
        await user.save()

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id)

        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
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
                },
                accessToken,
                refreshToken
            }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token is required'
            })
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)

        // Check if user exists
        const user = await User.findById(decoded.id)
        if (!user || !user.isActive) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid refresh token'
            })
        }

        // Generate new tokens
        const tokens = generateTokens(user._id)

        res.status(200).json({
            status: 'success',
            data: tokens
        })
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Invalid refresh token'
        })
    }
}

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logout successful'
    })
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription: user.subscription,
                    avatar: user.avatar,
                    socialAccounts: user.socialAccounts,
                    preferences: user.preferences,
                    acceptedTerms: user.acceptedTerms,
                    acceptedPrivacy: user.acceptedPrivacy,
                    acceptedConsent: user.acceptedConsent,
                    isAdult: user.isAdult,
                    defaultAddAiLabel: user.defaultAddAiLabel,
                    isVerified: user.isVerified,
                    createdAt: user.createdAt
                }
            }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}