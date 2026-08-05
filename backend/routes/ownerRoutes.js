import express from 'express'
import { protect, requireOwner } from '../middleware/auth.js'
import User from '../models/User.js'

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

export default router
