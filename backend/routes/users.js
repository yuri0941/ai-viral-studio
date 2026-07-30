import express from 'express'
import { protect } from '../middleware/auth.js'
import { getMe, updateMe, changePassword } from '../controllers/userController.js'

const router = express.Router()

router.get('/me', protect, getMe)
router.put('/me', protect, updateMe)
router.post('/change-password', protect, changePassword)

router.get('/profile', (req, res) => {
    res.json({ status: 'success', message: 'User profile' })
})

router.put('/profile', (req, res) => {
    res.json({ status: 'success', message: 'Update profile' })
})

export default router
