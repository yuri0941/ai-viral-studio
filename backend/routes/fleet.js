import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import fleetController from '../controllers/fleetController.js'

const router = express.Router()

router.get('/summary', protect, authorize('owner', 'admin'), fleetController.getFleetSummary)
router.post('/emergency-stop', protect, authorize('owner'), fleetController.emergencyStopFleet)

export default router
