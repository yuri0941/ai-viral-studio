import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import {
    getMyWhiteLabel,
    upsertWhiteLabel,
    previewWhiteLabel,
    listAgencyWhiteLabels,
} from '../controllers/whiteLabelController.js'

const router = express.Router()

router.get('/public/config', getMyWhiteLabel)

router.get('/me', protect, authorize('owner', 'admin', 'business'), getMyWhiteLabel)
router.post('/me', protect, authorize('owner', 'admin'), upsertWhiteLabel)
router.put('/me', protect, authorize('owner', 'admin'), upsertWhiteLabel)
router.post('/preview', protect, authorize('owner', 'admin'), previewWhiteLabel)
router.get('/all', protect, authorize('owner', 'admin'), listAgencyWhiteLabels)

export default router
