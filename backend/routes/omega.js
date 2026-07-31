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
    stats,
    generateTemplate,
    listTemplateLibrary,
    analyzeBrandVoice,
    getAutopilotStatus,
    setAutopilotStatus,
    createAutopilotPost,
    getSelfHealingStatus,
    analyzeYouTube,
    generateShorts,
    generateSubtitles,
    recommendPublishTime,
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
router.get('/stats', stats)
router.post('/generate-template', generateTemplate)
router.get('/templates', listTemplateLibrary)
router.post('/brand-voice/analyze', analyzeBrandVoice)
router.get('/autopilot', getAutopilotStatus)
router.post('/autopilot', setAutopilotStatus)
router.post('/autopilot/post', createAutopilotPost)
router.get('/self-healing', getSelfHealingStatus)
router.get('/youtube/analyze', analyzeYouTube)
router.post('/youtube/shorts', generateShorts)
router.post('/youtube/subtitles', generateSubtitles)
router.get('/youtube/best-time', recommendPublishTime)

export default router
