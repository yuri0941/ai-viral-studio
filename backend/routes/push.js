import { Router } from 'express'
import { getVapidPublicKey, subscribe, unsubscribe, sendPush } from '../controllers/pushController.js'
import { protect } from '../middleware/auth.js'
import { authorize } from '../middleware/auth.js'

const router = Router()

router.get('/vapid-public-key', getVapidPublicKey)
router.post('/subscribe', protect, subscribe)
router.post('/unsubscribe', protect, unsubscribe)

// [P21] added: admin/owner categorized push endpoint
router.post('/send', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { title, body, category = 'omega', route = '/', tag = 'alert' } = req.body || {}
        if (!title || !body) {
            return res.status(400).json({ status: 'error', message: 'title and body are required' })
        }
        const validCategories = ['omega', 'payment', 'crisis', 'task']
        const finalCategory = validCategories.includes(category) ? category : 'omega'
        await sendPush({ title, body, category: finalCategory, route, tag })
        res.json({ status: 'success', message: 'Notification sent' })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
