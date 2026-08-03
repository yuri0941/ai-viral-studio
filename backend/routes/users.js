import express from 'express'
import { protect } from '../middleware/auth.js'
import { getMe, updateMe, changePassword, changeEmail, deleteMyData, exportMyData } from '../controllers/userController.js'
import User from '../models/User.js'

const router = express.Router()

router.get('/me', protect, getMe)
router.put('/me', protect, updateMe)
router.patch('/me', protect, updateMe)
// [P16-FIX] added
router.patch('/me/socials', protect, async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { socials: req.body.socials } })
    res.json({ success: true })
})
router.post('/change-password', protect, changePassword)
router.post('/change-email', protect, changeEmail)
router.delete('/me/data', protect, deleteMyData)
router.get('/me/export', protect, exportMyData)

router.get('/profile', (req, res) => {
    res.json({ status: 'success', message: 'User profile' })
})

router.put('/profile', (req, res) => {
    res.json({ status: 'success', message: 'Update profile' })
})

export default router
