import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import {
  getMyLegalInfo,
  updateMyLegalInfo,
  getPublicLegalInfo
} from '../controllers/ownerLegalInfoController.js'

const router = Router()

router.get('/', protect, getMyLegalInfo)
router.put('/', protect, updateMyLegalInfo)
router.post('/', protect, updateMyLegalInfo)
router.get('/public', getPublicLegalInfo)

export default router
