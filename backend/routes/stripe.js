import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  status,
  createSubscriptionIntent,
  createInvoicePayment,
  webhook,
} from '../controllers/stripeController.js';

const router = Router();

// Public Stripe webhook (raw body should be used in server.js for this route)
router.post('/webhook', webhook);

// Protected routes
router.get('/status', protect, status);
router.post('/pay/subscription', protect, createSubscriptionIntent);
router.post('/pay/invoice/:invoiceId', protect, createInvoicePayment);

export default router;
