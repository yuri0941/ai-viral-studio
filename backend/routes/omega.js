import express from 'express'
import { getReflectionStatus } from '../ai/omega/selfReflection.js'
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
    getBrandVoice,
    toggleBrandVoice,
    getBestTime,
    getTrendsScout,
    generateCoverImage,
    getAutopilotStatus,
    setAutopilotStatus,
    createAutopilotPost,
    getSelfHealingStatus,
    analyzeYouTube,
    generateShorts,
    generateSubtitles,
    recommendPublishTime,
    speakVoice,
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
router.post('/templates/:id/generate', generateTemplate)
router.post('/brand-voice/analyze', analyzeBrandVoice)
router.get('/brand-voice', getBrandVoice)
router.post('/brand-voice/toggle', toggleBrandVoice)
router.post('/best-time', getBestTime)
router.get('/scout/trends', getTrendsScout)
router.post('/generate-cover', generateCoverImage)
router.get('/autopilot', getAutopilotStatus)
router.post('/autopilot', setAutopilotStatus)
router.post('/autopilot/toggle', setAutopilotStatus)
router.post('/autopilot/post', createAutopilotPost)
router.post('/predictions/recalculate', (req, res) => res.json({ status: 'success', message: 'Forecast recalculated' }))
router.post('/repurposing/enable', (req, res) => res.json({ status: 'success', data: { enabled: !!req.body?.enabled } }))
router.post('/voice/enable', (req, res) => res.json({ status: 'success', data: { enabled: !!req.body?.enabled } }))
// [P16-FIX] added
router.post('/predictive/enable', (req, res) => res.json({ enabled: true }))
router.post('/generate-name', (req, res) => {
    const prefixes = ['Nova', 'Flux', 'Orbit', 'Pulse', 'Zen']
    res.json({ status: 'success', name: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(Math.random() * 90 + 10)}` })
})
router.get('/self-healing', getSelfHealingStatus)
router.get('/self-reflection', (req, res) => res.json({ status: 'success', data: getReflectionStatus() }))
router.get('/youtube/analyze', analyzeYouTube)
router.post('/youtube/shorts', generateShorts)
router.post('/youtube/subtitles', generateSubtitles)
router.get('/youtube/best-time', recommendPublishTime)
router.post('/voice/speak', speakVoice)

export default router
