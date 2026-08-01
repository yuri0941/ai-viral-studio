import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import {
    listWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setDefaultWorkspace,
} from '../controllers/projectWorkspaceController.js'

const router = express.Router()

router.get('/', protect, authorize('owner', 'admin', 'business', 'creator'), listWorkspaces)
router.post('/', protect, authorize('owner', 'admin', 'business'), createWorkspace)
router.get('/:id', protect, authorize('owner', 'admin', 'business', 'creator'), getWorkspace)
router.patch('/:id', protect, authorize('owner', 'admin', 'business'), updateWorkspace)
router.delete('/:id', protect, authorize('owner', 'admin', 'business'), deleteWorkspace)
router.post('/:id/default', protect, authorize('owner', 'admin', 'business'), setDefaultWorkspace)

export default router
