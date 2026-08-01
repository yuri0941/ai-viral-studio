import { Router, raw } from 'express';
import { protect } from '../middleware/auth.js';
import {
  status,
  createSubscriptionIntent,
  createInvoicePayment,
  webhook,
} from '../controllers/stripeController.js';

const router = Router();

// Stripe webhook requires raw body for signature verification
router.post('/webhook', raw({ type: 'application/json' }), webhook);

// Protected routes
router.get('/status', protect, status);
router.post('/pay/subscription', protect, createSubscriptionIntent);
router.post('/pay/invoice/:invoiceId', protect, createInvoicePayment);

export default router;
