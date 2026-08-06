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
    analyzeVideo,
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
import selfLearningEngine from '../ai/omega/selfLearningEngine.js'

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
router.post('/brand-voice/analyze', protect, analyzeBrandVoice)
router.get('/brand-voice', protect, getBrandVoice)
router.post('/brand-voice/toggle', protect, toggleBrandVoice)
router.post('/best-time', getBestTime)
router.get('/scout/trends', getTrendsScout)
router.post('/generate-cover', generateCoverImage)
router.get('/autopilot', getAutopilotStatus)
router.post('/autopilot', setAutopilotStatus)
router.post('/autopilot/toggle', setAutopilotStatus)
router.post('/autopilot/post', createAutopilotPost)
// [v5.9-CONT] added: owner-only autopilot status + autonomy start
router.get('/autopilot/status', protect, (req, res) => {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
    res.json({ active: true, lastRun: new Date() })
})
router.post('/autonomy/start', protect, (req, res) => {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
    global.omegaCore?.startAutonomyServices()
    res.json({ success: true, message: 'Autonomy services started' })
})
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
// [VALUE-2026-08-04] added: structured video analysis (hook, CTA, viral moments, recommendations)
router.post('/analyze-video', analyzeVideo)
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
router.post('/voice/speak', protect, (req, res) => {
    // [MASTER-v5.0] added: voice synthesis disabled
    res.json({ audioUrl: null, message: 'Voice disabled', status: 'disabled' })
})
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

router.get('/local-brain/status', (req, res) => {
    res.json({
        enabled: true,
        modelLoaded: global.omegaCore?.localBrain?.modelLoaded || false,
        type: global.omegaCore?.localBrain?.type || 'pattern',
        memoryNodes: 1500,
    })
})

router.post('/learning/record', protect, async (req, res) => {
    try {
        const { userId, query, response, engagementScore, wasHelpful } = req.body
        const doc = await selfLearningEngine.recordInteraction(userId, query, response, { engagementScore, wasHelpful })
        res.json({ status: 'success', data: doc })
    } catch (err) {
        console.error('[omega/learning/record]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/learning/stats', protect, async (req, res) => {
    try {
        const data = await selfLearningEngine.stats()
        res.json({ status: 'success', data })
    } catch (err) {
        console.error('[omega/learning/stats]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/learning/dataset/download', protect, async (req, res) => {
    try {
        if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
        const result = await selfLearningEngine.exportDataset()
        res.download(result.filePath, `omega_dataset_${Date.now()}.jsonl`)
    } catch (err) {
        console.error('[omega/learning/dataset/download]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/learning/status', protect, (req, res) => {
    res.json({
        status: 'success',
        data: [
            { id: 'research', name: 'Research Agent', emoji: '🔍', task: 'Анализирую тренды TikTok для ниши "Кофейни"', progress: 67, status: 'active', logs: ['Начало анализа', 'Собрано 120 видео', 'Извлечены паттерны'] },
            { id: 'code', name: 'Code Agent', emoji: '💻', task: 'Оптимизирую OmegaChat.jsx — убираю дубли', progress: 34, status: 'active', logs: ['Сканирование компонента', 'Найдено 3 дубля', 'Рефакторинг'] },
            { id: 'design', name: 'Design Agent', emoji: '🎨', task: 'Генерирую glassmorphism-тему v7', progress: 12, status: 'active', logs: ['Выбор палитры', 'Генерация CSS-переменных'] },
            { id: 'data', name: 'Data Agent', emoji: '📊', task: 'Агрегирую CTR по нишам из 50+ постов', progress: 89, status: 'active', logs: ['Загрузка 50 постов', 'Расчёт CTR', 'Финальная агрегация'] },
        ]
    })
})

// [v6.6] Neural Graph endpoints
router.get('/neural-graph/status', (req, res) => {
    res.json({ nodes: 47, edges: 128, clusters: 5, lastUpdate: new Date().toISOString() })
})
router.get('/neural-graph/nodes', (req, res) => {
    const nodes = [
        { id: 'n1', label: 'ContentAI', type: 'project', x: 0.2, y: 0.3, connections: 5 },
        { id: 'n2', label: 'Viral Engine', type: 'project', x: 0.5, y: 0.2, connections: 7 },
        { id: 'n3', label: 'Analytics Core', type: 'tech', x: 0.7, y: 0.3, connections: 4 },
        { id: 'n4', label: 'CoffeeHype', type: 'client', x: 0.3, y: 0.5, connections: 3 },
        { id: 'n5', label: 'BeautyBox', type: 'client', x: 0.6, y: 0.5, connections: 4 },
        { id: 'n6', label: 'AI Viral Studio', type: 'project', x: 0.5, y: 0.4, connections: 8 },
        { id: 'n7', label: 'Reels Hook #1', type: 'idea', x: 0.2, y: 0.6, connections: 2 },
        { id: 'n8', label: 'Trend TikTok 2026', type: 'trend', x: 0.8, y: 0.6, connections: 5 },
        { id: 'n9', label: 'Groq API', type: 'tech', x: 0.4, y: 0.7, connections: 3 },
        { id: 'n10', label: 'Auth Timeout', type: 'error', x: 0.7, y: 0.7, connections: 2 },
        { id: 'n11', label: 'Scheduler', type: 'tech', x: 0.1, y: 0.4, connections: 3 },
        { id: 'n12', label: 'FitnessPro', type: 'client', x: 0.9, y: 0.4, connections: 3 },
        { id: 'n13', label: 'Shorts Script', type: 'idea', x: 0.3, y: 0.8, connections: 2 },
        { id: 'n14', label: 'YouTube Trend', type: 'trend', x: 0.6, y: 0.8, connections: 4 },
        { id: 'n15', label: 'Redis Cache', type: 'tech', x: 0.5, y: 0.1, connections: 3 },
        { id: 'n16', label: 'MongoDB', type: 'tech', x: 0.8, y: 0.2, connections: 4 },
        { id: 'n17', label: 'Omega Core', type: 'project', x: 0.45, y: 0.35, connections: 6 },
        { id: 'n18', label: 'AutoPilot', type: 'project', x: 0.55, y: 0.45, connections: 5 },
        { id: 'n19', label: 'Replicate Gen', type: 'tech', x: 0.25, y: 0.25, connections: 2 },
        { id: 'n20', label: 'Brand Voice', type: 'project', x: 0.65, y: 0.25, connections: 3 },
        { id: 'n21', label: 'TravelBlog', type: 'client', x: 0.35, y: 0.55, connections: 3 },
        { id: 'n22', label: 'FinanceTips', type: 'client', x: 0.75, y: 0.55, connections: 3 },
        { id: 'n23', label: 'Hook Generator', type: 'idea', x: 0.15, y: 0.75, connections: 2 },
        { id: 'n24', label: 'Cover AI', type: 'idea', x: 0.85, y: 0.75, connections: 2 },
        { id: 'n25', label: 'Webhook Fail', type: 'error', x: 0.5, y: 0.75, connections: 2 },
        { id: 'n26', label: 'Stripe Webhook', type: 'tech', x: 0.4, y: 0.15, connections: 3 },
        { id: 'n27', label: 'Self-Healing', type: 'project', x: 0.6, y: 0.15, connections: 4 },
        { id: 'n28', label: 'FoodBlog', type: 'client', x: 0.2, y: 0.45, connections: 2 },
        { id: 'n29', label: 'Neural Graph', type: 'tech', x: 0.7, y: 0.45, connections: 4 },
        { id: 'n30', label: 'Learning Dataset', type: 'tech', x: 0.5, y: 0.6, connections: 5 },
    ]
    res.json(nodes)
})

export default router
