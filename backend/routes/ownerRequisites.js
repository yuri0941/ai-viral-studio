import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyRequisites,
  createOrUpdateRequisites,
  deleteRequisites,
} from '../controllers/ownerRequisitesController.js';

const router = Router();

router.get('/', protect, getMyRequisites);
router.post('/', protect, createOrUpdateRequisites);
router.put('/', protect, createOrUpdateRequisites);
router.delete('/', protect, deleteRequisites);

export default router;
