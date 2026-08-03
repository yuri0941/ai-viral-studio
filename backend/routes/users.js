import express from 'express'
import { protect } from '../middleware/auth.js'
import { getMe, updateMe, updateSocials, changePassword, changeEmail, deleteMyData, exportMyData } from '../controllers/userController.js'

const router = express.Router()

router.get('/me', protect, getMe)
router.put('/me', protect, updateMe)
router.patch('/me', protect, updateMe)
router.patch('/me/socials', protect, updateSocials)
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
