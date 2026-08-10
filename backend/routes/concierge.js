import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { handleConciergeRequest } from '../services/concierge.js';
import Booking from '../models/Booking.js';
import Order from '../models/Order.js';

const router = Router();

router.post('/request', protect, async (req, res) => {
  try {
    const result = await handleConciergeRequest(req.user._id, req.body.request);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
