import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import franchiseController from '../controllers/franchiseController.js'

const router = express.Router()

router.get('/ready', protect, franchiseController.checkReady)
router.get('/', protect, franchiseController.listKits)
router.post('/generate', protect, authorize('owner', 'admin'), franchiseController.generateKit)
router.get('/:id/download', protect, franchiseController.downloadKit)
router.post('/:id/send', protect, authorize('owner', 'admin'), franchiseController.sendToCandidates)

export default router
