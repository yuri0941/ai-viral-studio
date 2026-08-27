import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
    try {
        // [v6.0] added: strict authorization header check
        if (!req.headers.authorization) {
            // [v9.9.19-HOTFIX] development-only bypass for local smoke tests
            if (process.env.NODE_ENV === 'development') {
                req.user = {
                    id: '000000000000000000000000',
                    _id: '000000000000000000000000',
                    email: 'dev@localhost',
                    role: 'owner',
                    subscription: 'agency',
                    acceptedTerms: true,
                    acceptedPrivacy: true,
                    acceptedConsent: true,
                    isAdult: true,
                }
                return next()
            }
            return res.status(401).json({ status: 'error', error: 'Unauthorized' })
        }

        // [HOTFIX-2026-08-04] added — extract token from any Authorization header
        const token = req.headers.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).json({
                status: 'error',
                error: 'Invalid token'
            })
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            // Check if user exists
            const user = await User.findById(decoded.id)
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    error: 'Invalid token'
                })
            }

            if (!user.isActive) {
                return res.status(401).json({
                    status: 'error',
                    error: 'Account is deactivated'
                })
            }

            // Add user to request
            // [CLIENT-JOURNEY-QA] _id обязателен: без него запросы вида
            // { userId: req.user._id } превращались в { userId: undefined }
            // и матчили ЧУЖИЕ записи (баг: чужой активный аддон блокировал покупку).
            req.user = {
                id: user._id,
                _id: user._id,
                email: user.email,
                role: user.role,
                subscription: user.subscription,
                acceptedTerms: user.acceptedTerms,
                acceptedPrivacy: user.acceptedPrivacy,
                acceptedConsent: user.acceptedConsent,
                isAdult: user.isAdult,
            }

            // [v6.0] added: ensure user has a role before proceeding
            if (req.user && req.user.role) {
                return next()
            }

            return res.status(401).json({ status: 'error', error: 'Invalid token' })
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    code: 'TOKEN_EXPIRED',
                    error: 'Token expired'
                })
            }
            return res.status(401).json({
                status: 'error',
                error: 'Invalid token'
            })
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// Owner-only access control
export const requireOwner = (req, res, next) => {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({
            status: 'error',
            error: 'Access denied',
            required: 'owner',
            current: req.user?.role
        })
    }
    next()
}
// Role-based access control (generic)
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', error: 'Unauthorized' })
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                error: 'Access denied',
                required: roles,
                current: req.user.role
            })
        }
        next()
    }
}

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Role ${req.user.role} is not authorized to access this resource`
            })
        }
        next()
    }
}

// Subscription-based access control
export const requireSubscription = (...subscriptions) => {
    return (req, res, next) => {
        if (!subscriptions.includes(req.user.subscription)) {
            return res.status(403).json({
                status: 'error',
                message: `This feature requires ${subscriptions.join(' or ')} subscription`
            })
        }
        next()
    }
}