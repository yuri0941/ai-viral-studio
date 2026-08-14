import { User } from '../models/index.js'

function maskVkCommunityKey(key) {
  if (!key) return ''
  if (key.length < 14) return '••••'
  return `${key.slice(0, 6)}••••${key.slice(-4)}`
}

function normalizeVkGroupId(raw) {
  if (!raw) return ''
  const str = String(raw).trim().replace(/^-/, '')
  return /^\d+$/.test(str) ? str : ''
}

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+vkCommunityKey')
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
        telegramBotToken: user.telegramBotToken,
        telegramChatId: user.telegramChatId,
        vkCommunityKey: maskVkCommunityKey(user.vkCommunityKey),
        vkGroupId: user.vkGroupId || '',
        vkConnected: user.vkConnected || false,
        notificationSettings: user.notificationSettings || { notifyPublishSuccess: true, notifyPublishFail: true },
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
    const { name, avatar, preferences, defaultAddAiLabel, phone, telegram, telegramBotToken, telegramChatId, role, watermarkSettings, vkCommunityKey, vkGroupId, notificationSettings } = req.body || {}

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (avatar !== undefined) updates.avatar = avatar.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (telegram !== undefined) updates.telegram = telegram.trim()
    if (telegramBotToken !== undefined) updates.telegramBotToken = telegramBotToken.trim()
    if (telegramChatId !== undefined) updates.telegramChatId = String(telegramChatId).trim()
    if (defaultAddAiLabel !== undefined) updates.defaultAddAiLabel = !!defaultAddAiLabel

    // [v9.9.19.15.5] per-user VK community key + group id stored at root level to avoid socials path collision
    if (vkCommunityKey !== undefined || vkGroupId !== undefined) {
      const key = typeof vkCommunityKey === 'string' ? vkCommunityKey.trim() : ''
      const normalizedGroupId = normalizeVkGroupId(vkGroupId)

      if (vkCommunityKey !== undefined && key.length > 0 && key.length < 10) {
        return res.status(400).json({ success: false, error: 'vk_key_too_short', message: 'Ключ сообщества VK должен быть не короче 10 символов' })
      }
      if (vkGroupId !== undefined && String(vkGroupId).trim() && !normalizedGroupId) {
        return res.status(400).json({ success: false, error: 'vk_invalid_group', message: 'ID группы VK должен содержать только цифры' })
      }

      if (vkCommunityKey !== undefined) updates.vkCommunityKey = key
      if (vkGroupId !== undefined) updates.vkGroupId = normalizedGroupId

      const currentUser = await User.findById(userId).select('+vkCommunityKey').lean()
      const finalKey = vkCommunityKey !== undefined ? key : (currentUser?.vkCommunityKey || '')
      const finalGroupId = vkGroupId !== undefined ? normalizedGroupId : normalizeVkGroupId(currentUser?.vkGroupId)
      updates.vkConnected = !!finalKey && !!finalGroupId
    }

    // [P20] added: watermark settings
    if (watermarkSettings && typeof watermarkSettings === 'object') {
      updates.watermarkSettings = {}
      if (typeof watermarkSettings.enabled === 'boolean') updates.watermarkSettings.enabled = watermarkSettings.enabled
      if (watermarkSettings.position) updates.watermarkSettings.position = watermarkSettings.position
      if (typeof watermarkSettings.opacity === 'number') updates.watermarkSettings.opacity = watermarkSettings.opacity
      if (typeof watermarkSettings.size === 'number') updates.watermarkSettings.size = watermarkSettings.size
      updates.watermarkSettings.updatedAt = new Date()
    }

    // [v9.9.19.15.8] notification toggles for publish success/fail
    if (notificationSettings && typeof notificationSettings === 'object') {
      updates.notificationSettings = {}
      if (typeof notificationSettings.notifyPublishSuccess === 'boolean') updates.notificationSettings.notifyPublishSuccess = notificationSettings.notifyPublishSuccess
      if (typeof notificationSettings.notifyPublishFail === 'boolean') updates.notificationSettings.notifyPublishFail = notificationSettings.notifyPublishFail
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
      // [FIX-BUFFER] любая смена роли — в AuditLog
      try {
        const { default: AuditLog } = await import('../models/AuditLog.js')
        await AuditLog.create({
          action: 'security.role_change',
          user: String(req.user.email || req.user._id),
          userId: req.user._id,
          type: 'security',
          severity: privileged.includes(role) ? 'high' : 'low',
          metadata: { from: req.user.role, to: role },
          timestamp: new Date(),
        })
      } catch (auditErr) {
        console.warn('[userController] role audit failed:', auditErr.message)
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
      if (typeof preferences.autoCleanTTL === 'number' && [-1, 0, 15, 60].includes(preferences.autoCleanTTL)) {
        updates.preferences.autoCleanTTL = preferences.autoCleanTTL
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('+vkCommunityKey')
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
        telegramBotToken: user.telegramBotToken,
        telegramChatId: user.telegramChatId,
        vkCommunityKey: maskVkCommunityKey(user.vkCommunityKey),
        vkGroupId: user.vkGroupId || '',
        vkConnected: user.vkConnected || false,
        notificationSettings: user.notificationSettings || { notifyPublishSuccess: true, notifyPublishFail: true },
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
