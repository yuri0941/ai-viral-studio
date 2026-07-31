import { User } from '../models/index.js'

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

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Текущий и новый пароль обязательны' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Новый пароль должен быть минимум 6 символов' })
    }

    const user = await User.findById(req.user.id).select('+password')
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный текущий пароль' })
    }

    user.password = newPassword
    await user.save()

    res.json({ success: true, message: 'Пароль успешно изменён' })
  } catch (err) {
    console.error('[changePassword]', err)
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
}

export const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body || {}

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ success: false, message: 'Новый email и текущий пароль обязательны' })
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      return res.status(400).json({ success: false, message: 'Некорректный email' })
    }

    const normalizedEmail = newEmail.toLowerCase().trim()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Этот email уже используется' })
    }

    const user = await User.findById(req.user.id).select('+password')
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный текущий пароль' })
    }

    user.email = normalizedEmail
    user.isVerified = false
    await user.save()

    const token = user.generateToken()

    res.json({
      success: true,
      message: 'Email успешно изменён',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (err) {
    console.error('[changeEmail]', err)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Этот email уже используется' })
    }
    res.status(500).json({ success: false, message: 'Ошибка сервера' })
  }
}
