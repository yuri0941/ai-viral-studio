import express, { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createSubscriptionPayment,
  createInvoicePaymentLink,
  checkPaymentStatus,
  yookassaWebhook,
} from '../controllers/yookassaController.js';

const router = Router();

// Public webhook (YooKassa signs requests via IP; for test we accept raw body)
// [MONETIZE-2026-08-04] added: raw body parser for webhook signature compatibility
router.post('/webhook', express.raw({ type: 'application/json' }), yookassaWebhook);

// Protected payment creation
router.post('/pay/subscription', protect, createSubscriptionPayment);
router.post('/pay/invoice/:invoiceId', protect, createInvoicePaymentLink);
router.get('/check/:paymentId', protect, checkPaymentStatus);

export default router;
