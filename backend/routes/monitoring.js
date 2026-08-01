import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import monitoringController from '../controllers/monitoringController.js'

const router = express.Router()

router.get('/self-healing', protect, monitoringController.getSelfHealingStatus)
router.put('/self-healing/auto-heal', protect, authorize('owner', 'admin'), monitoringController.toggleAutoHeal)
router.post('/self-healing/trigger', protect, authorize('owner', 'admin'), monitoringController.triggerSelfHealTick)

router.get('/crises', protect, monitoringController.listCrises)
router.get('/crises/sources', protect, monitoringController.getCrisisSources)
router.post('/crises/analyze', protect, authorize('owner', 'admin'), monitoringController.analyzeCrisis)
router.post('/crises/:id/resolve', protect, authorize('owner', 'admin'), monitoringController.resolveCrisis)
router.post('/crises/:id/reject', protect, authorize('owner', 'admin'), monitoringController.rejectCrisis)

router.get('/self-reflection', protect, monitoringController.getSelfReflectionReport)
router.post('/self-reflection/send', protect, authorize('owner', 'admin'), monitoringController.sendSelfReflectionReport)

export default router
