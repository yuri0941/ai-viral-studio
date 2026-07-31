import express from 'express'
import {
    getStatus,
    chat,
    getMemory,
    createMemory,
    getSkills,
    learnSkill,
    sendCommand,
    rate,
} from '../controllers/omegaController.js'

const router = express.Router()

router.get('/status', getStatus)
router.post('/chat', chat)
router.get('/memory', getMemory)
router.post('/memory', createMemory)
router.get('/skills', getSkills)
router.post('/skills/learn', learnSkill)
router.post('/command', sendCommand)
router.post('/rate', rate)

export default router
