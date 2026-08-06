import express from 'express'
import { protect, requireOwner } from '../middleware/auth.js'
import User from '../models/User.js'

import { generateDailyReport } from '../services/autoReportService.js'
import { OwnerSettings } from '../models/OwnerSettings.js'

const router = express.Router()

router.get('/settings', protect, requireOwner, (req, res) => {
  res.json({ success: true, settings: {} })
})

router.get('/team-activity', protect, requireOwner, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['client', 'creator', 'staff', 'advertiser'] } })
      .select('name email role lastActive createdAt')
      .sort({ lastActive: -1 })
      .limit(20)
    const stats = {
      totalClients: await User.countDocuments({ role: 'client' }),
      totalCreators: await User.countDocuments({ role: 'creator' }),
      totalStaff: await User.countDocuments({ role: 'staff' }),
      newToday: await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      recentActivity: users
    }
    res.json({ success: true, stats })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/auto-report', protect, requireOwner, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id
    const settings = await OwnerSettings.findOne({ ownerId }).lean()
    res.json({
      success: true,
      report: settings?.lastReport || null,
      settings: settings?.autoReport || { enabled: true, time: '08:00', frequency: 'daily', channels: ['in-app'] },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/auto-report/settings', protect, requireOwner, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id
    const allowed = ['enabled', 'time', 'frequency', 'channels']
    const updates = {}
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[`autoReport.${key}`] = req.body[key]
    })
    const settings = await OwnerSettings.findOneAndUpdate(
      { ownerId },
      { $set: updates },
      { upsert: true, new: true }
    )
    res.json({ success: true, settings: settings.autoReport })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/auto-report/generate', protect, requireOwner, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id
    const report = await generateDailyReport(ownerId)
    res.json({ success: true, report })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
