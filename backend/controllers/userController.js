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
        socials: user.socials,
        preferences: user.preferences,
        timezone: user.preferences?.timezone,
        phone: user.phone,
        telegram: user.telegram,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        acceptedConsent: user.acceptedConsent,
        isAdult: user.isAdult,
        defaultAddAiLabel: user.defaultAddAiLabel,
        isVerified: user.isVerified,
        watermarkSettings: user.watermarkSettings,
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
    const { name, avatar, preferences, defaultAddAiLabel, phone, telegram, role, watermarkSettings } = req.body || {}

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (avatar !== undefined) updates.avatar = avatar.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (telegram !== undefined) updates.telegram = telegram.trim()
    if (defaultAddAiLabel !== undefined) updates.defaultAddAiLabel = !!defaultAddAiLabel

    // [P20] added: watermark settings
    if (watermarkSettings && typeof watermarkSettings === 'object') {
      updates.watermarkSettings = {}
      if (typeof watermarkSettings.enabled === 'boolean') updates.watermarkSettings.enabled = watermarkSettings.enabled
      if (watermarkSettings.position) updates.watermarkSettings.position = watermarkSettings.position
      if (typeof watermarkSettings.opacity === 'number') updates.watermarkSettings.opacity = watermarkSettings.opacity
      if (typeof watermarkSettings.size === 'number') updates.watermarkSettings.size = watermarkSettings.size
      updates.watermarkSettings.updatedAt = new Date()
    }

    // [P16] Role switching via dashboard header
    if (role !== undefined) {
      const allowedRoles = ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business']
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' })
      }
      // Only owners can elevate to owner/admin/staff; admins can stay admin or lower
      const privileged = ['owner', 'admin', 'staff']
      if (privileged.includes(role) && req.user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Not allowed to set this role' })
      }
      updates.role = role
    }
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
      if (preferences.timezone && typeof preferences.timezone === 'string') updates.preferences.timezone = preferences.timezone
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
        socials: user.socials,
        preferences: user.preferences,
        timezone: user.preferences?.timezone,
        phone: user.phone,
        telegram: user.telegram,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        acceptedConsent: user.acceptedConsent,
        isAdult: user.isAdult,
        defaultAddAiLabel: user.defaultAddAiLabel,
        isVerified: user.isVerified,
        watermarkSettings: user.watermarkSettings
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [P16-FIX] added: update user socials
export const updateSocials = async (req, res) => {
  try {
    const userId = req.user.id
    const { instagram, tiktok, youtube, telegram, vk, twitter, linkedin } = req.body || {}
    const updates = {}
    const platforms = { instagram, tiktok, youtube, telegram, vk, twitter, linkedin }
    Object.entries(platforms).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        updates[`socials.${key}`] = {
          username: String(value.username || '').trim(),
          link: String(value.link || '').trim(),
        }
      }
    })

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, socials: user.socials })
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

export const deleteMyData = async (req, res) => {
  try {
    const userId = req.user.id
    const deletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await User.findByIdAndUpdate(userId, { deletionScheduledAt: deletionAt, isActive: false })
    res.json({ success: true, message: 'Account scheduled for deletion in 30 days', deletionAt })
  } catch (err) {
    console.error('[deleteMyData]', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const exportMyData = async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires').lean()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await User.findByIdAndUpdate(userId, { dataExportRequestedAt: new Date() })
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="my-data-export.json"')
    res.json({ success: true, exportedAt: new Date().toISOString(), data: user })
  } catch (err) {
    console.error('[exportMyData]', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
