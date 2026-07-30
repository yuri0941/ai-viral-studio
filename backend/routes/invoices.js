import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
} from '../controllers/invoiceController.js';

const router = Router();

router.get('/', protect, getMyInvoices);
router.get('/:id', protect, getInvoiceById);
router.post('/', protect, createInvoice);
router.patch('/:id', protect, updateInvoice);
router.post('/:id/pay', protect, markInvoicePaid);
router.delete('/:id', protect, deleteInvoice);

export default router;
