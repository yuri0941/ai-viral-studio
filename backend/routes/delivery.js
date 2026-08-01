import express from 'express'
import { protect } from '../middleware/auth.js'
import deliveryController from '../controllers/deliveryController.js'

const router = express.Router()

router.post('/deep-link', protect, deliveryController.generateDeepLink)
router.post('/team-order', protect, deliveryController.createTeamOrder)

export default router
