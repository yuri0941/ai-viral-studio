import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import qrController from '../controllers/qrController.js'

const router = express.Router()

router.get('/', protect, qrController.listQRs)
router.post('/generate', protect, authorize('owner', 'admin', 'business'), qrController.generateQR)
router.get('/:id/analytics', protect, qrController.getAnalytics)
router.get('/:id/download', protect, qrController.downloadQR)
router.delete('/:id', protect, authorize('owner', 'admin', 'business'), qrController.deleteQR)

export default router
