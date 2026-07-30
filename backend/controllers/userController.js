import { User } from '../models/index.js'
import { protect } from '../middleware/auth.js'

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({
      success: true,
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
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, avatar, preferences, defaultAddAiLabel } = req.body || {}

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (avatar !== undefined) updates.avatar = avatar.trim()
    if (defaultAddAiLabel !== undefined) updates.defaultAddAiLabel = !!defaultAddAiLabel
    if (preferences && typeof preferences === 'object') {
      updates.preferences = {}
      if (preferences.language) updates.preferences.language = preferences.language
      if (preferences.currency && ['RUB', 'USD', 'EUR'].includes(preferences.currency)) {
        updates.preferences.currency = preferences.currency
      }
      if (preferences.theme && ['dark', 'light', 'system'].includes(preferences.theme)) {
        updates.preferences.theme = preferences.theme
      }
      if (typeof preferences.notifications === 'boolean') updates.preferences.notifications = preferences.notifications
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
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
        isVerified: user.isVerified
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
