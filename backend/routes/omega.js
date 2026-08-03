import express from 'express'
import multer from 'multer'
import { protect } from '../middleware/auth.js'
import { getReflectionStatus } from '../ai/omega/selfReflection.js'
import { speechToText } from '../services/voiceService.js'
import { analyzeCSV, generateChartData, generateInsights } from '../ai/omega/codeInterpreter.js'
import { analyzeImage } from '../ai/omega/visionCore.js'
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
    generateVideo,
} from '../controllers/omegaController.js'
import {
    getApprovalQueue,
    approvePatch,
    rejectPatch,
    analyzeCodebase,
    generateOptimization,
    runInSandbox,
    addToApprovalQueue,
} from '../ai/omega/omegaCoder.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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
// [P19] added: voice STT endpoint
router.post('/voice/stt', protect, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'No audio file' })
        const result = await speechToText(req.file.buffer, req.file.mimetype)
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[omega:voice/stt]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.post('/voice/speak', speakVoice)
// [P19] added: AI video generation
router.post('/generate-video', protect, generateVideo)

// [P17] added: code interpreter endpoint for CSV data
router.post('/interpret', protect, async (req, res) => {
    try {
        const { csvText, niche } = req.body
        const data = analyzeCSV(csvText)
        const chart = generateChartData(data.rows)
        const insights = await generateInsights(data, niche)
        res.json({ status: 'success', data: { ...data, chart, insights } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// [P17] added: vision analysis endpoint
router.post('/vision/analyze', protect, async (req, res) => {
    try {
        const { imageUrl } = req.body
        const result = await analyzeImage(imageUrl)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// [P19] added: OmegaCoder v2 sandbox / approval queue routes
router.get('/coder/queue', protect, async (req, res) => {
    try {
        const items = await getApprovalQueue(req.query)
        res.json({ status: 'success', data: items })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/coder/analyze', protect, async (req, res) => {
    try {
        const { filePath, issue } = req.body || {}
        if (!filePath) return res.status(400).json({ status: 'error', message: 'filePath required' })
        const patch = await generateOptimization(filePath, issue)
        const item = await addToApprovalQueue(patch)
        res.json({ status: 'success', data: item })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/coder/approve/:patchId', protect, async (req, res) => {
    try {
        const item = await approvePatch(req.params.patchId)
        res.json({ status: 'success', data: item })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/coder/reject/:patchId', protect, async (req, res) => {
    try {
        const item = await rejectPatch(req.params.patchId)
        res.json({ status: 'success', data: item })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/coder/sandbox', protect, async (req, res) => {
    try {
        const { code, filename } = req.body || {}
        if (!code) return res.status(400).json({ status: 'error', message: 'code required' })
        const result = await runInSandbox(code, filename)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/coder/codebase', protect, async (req, res) => {
    try {
        const result = await analyzeCodebase()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// [P19] added: read current file content for diff viewer
router.get('/coder/file', protect, async (req, res) => {
    try {
        const filePath = req.query.path
        if (!filePath) return res.status(400).json({ status: 'error', message: 'path required' })
        const fs = await import('fs/promises')
        const path = await import('path')
        const { fileURLToPath } = await import('url')
        const __filename = fileURLToPath(import.meta.url)
        const PROJECT_ROOT = path.resolve(path.dirname(__filename), '../..')
        const normalized = path.normalize(filePath)
        const allowed = [
            path.join(PROJECT_ROOT, 'backend/ai/omega'),
            path.join(PROJECT_ROOT, 'frontend/src/ai/omega'),
        ]
        if (!allowed.some(a => normalized.startsWith(a))) {
            return res.status(403).json({ status: 'error', message: 'Forbidden path' })
        }
        const content = await fs.default.readFile(normalized, 'utf8')
        res.json({ status: 'success', data: content })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
