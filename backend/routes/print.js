import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import printController from '../controllers/printController.js'

const router = express.Router()

router.get('/', protect, printController.listOrders)
router.post('/order', protect, authorize('owner', 'admin', 'business'), printController.createOrder)
router.get('/status/:orderId', protect, printController.getOrderStatus)

export default router
