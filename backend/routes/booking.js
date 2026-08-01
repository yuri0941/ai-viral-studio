import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import bookingController from '../controllers/bookingController.js'

const router = express.Router()

router.get('/studios', protect, bookingController.searchStudios)
router.get('/suggestions', protect, bookingController.getSuggestions)
router.get('/', protect, bookingController.listBookings)
router.get('/:id', protect, bookingController.getBooking)
router.post('/', protect, authorize('owner', 'admin', 'business'), bookingController.createBooking)

export default router
