import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
    try {
        let token

        // Check for token in header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Not authorized, no token'
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
                    message: 'User not found'
                })
            }

            if (!user.isActive) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Account is deactivated'
                })
            }

            // Add user to request
            req.user = {
                id: user._id,
                email: user.email,
                role: user.role,
                subscription: user.subscription,
                acceptedTerms: user.acceptedTerms,
                acceptedPrivacy: user.acceptedPrivacy,
                acceptedConsent: user.acceptedConsent,
                isAdult: user.isAdult,
            }

            next()
        } catch (error) {
            return res.status(401).json({
                status: 'error',
                message: 'Not authorized, token failed'
            })
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// Role-based access control
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