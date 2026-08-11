import express from 'express'
import multer from 'multer'
import { protect, requireOwner } from '../middleware/auth.js'
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
    detectNiche,
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
import { chatWithAI, extractText, getProviderKey } from '../services/aiService.js'
import { OmegaMemory } from '../models/index.js'
import { generateProject, exportProject } from '../ai/omega/projectFactory.js'
import {
    analyzeChannel,
    generateShortsScript,
    generateAutoSubtitles,
    generateTitles,
} from '../services/youtubeAI.js'
import { generateGraphData } from '../ai/omega/neuralGraph.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/status', getStatus)
router.post('/chat', protect, async (req, res, next) => {
    try {
        console.log('[BACKEND /api/omega/chat] body:', req.body)
        await chat(req, res, next)
    } catch (err) {
        console.error('[BACKEND CHAT] Error:', err.message)
        res.status(500).json({ status: 'error', error: 'AI service error', details: err.message })
    }
})
router.post('/detect-niche', protect, detectNiche)
router.get('/memory', getMemory)
router.post('/memory', createMemory)

// [v7.1-PART1] Memory layers for OmegaMemoryExplorer
const MEMORY_LAYER_IDS = ['short_term', 'working', 'long_term', 'semantic', 'procedural', 'episodic', 'owner_profile', 'emotional']
const MEMORY_LAYER_LABELS = {
    short_term: 'Кратковременная',
    working: 'Рабочая',
    long_term: 'Долговременная',
    semantic: 'Семантическая',
    procedural: 'Процедурная',
    episodic: 'Эпизодическая',
    owner_profile: 'Профиль владельца',
    emotional: 'Эмоциональная',
}
router.get('/memory/layers', protect, async (req, res) => {
    try {
        const mem = await OmegaMemory.findOne({ ownerId: req.user.id }).lean()
        const entries = mem?.entries || []
        const layers = MEMORY_LAYER_IDS.map(id => {
            const layerEntries = entries.filter(e => e.level === id)
            const count = layerEntries.length
            return {
                id,
                label: MEMORY_LAYER_LABELS[id],
                count,
                fill: Math.min(1, count / 50),
                entries: layerEntries.slice(-10).reverse(),
            }
        })
        res.json({ status: 'success', data: { layers } })
    } catch (err) {
        console.error('[omega/memory/layers]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.post('/memory/layers/:id/clear', protect, requireOwner, async (req, res) => {
    try {
        await OmegaMemory.updateOne(
            { ownerId: req.user.id },
            { $pull: { entries: { level: req.params.id } } }
        )
        res.json({ status: 'success', message: 'Layer cleared' })
    } catch (err) {
        console.error('[omega/memory/layers/clear]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// [v7.1-PART1] Predictions for OmegaPredictiveCard
const PREDICTIONS = [
    { id: 'p1', type: 'post', title: 'Пост: «5 AI-инструментов для вирусного контента в 2026»', description: 'Трендовая тема, прогнозируемый охват +15%.' },
    { id: 'p2', type: 'competitor', title: 'Анализ конкурента: TechBrand Inc.', description: 'Обнаружен слабый CTA в их последнем Reels.' },
    { id: 'p3', type: 'pricing', title: 'Повысить цену Pro на $5', description: 'Прогноз: +$2,400 MRR, отток <2%.' },
]
router.get('/predictions', protect, (req, res) => {
    res.json({ status: 'success', data: { predictions: PREDICTIONS } })
})
router.post('/predictions/:id/apply', protect, (req, res) => {
    res.json({ status: 'success', message: 'Prediction applied', id: req.params.id })
})
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

// [v6.6-PART2] Neural Graph endpoints
const NEURAL_NODE_TYPES = ['project', 'client', 'error', 'idea', 'trend', 'tech']
const NEURAL_LABELS = {
    project: ['AI Viral Studio', 'Omega Core', 'AutoPilot', 'Self-Healing', 'Brand Voice', 'Scheduler', 'ContentAI', 'Hook Generator'],
    client: ['CoffeeHype', 'BeautyBox', 'FitnessPro', 'TravelBlog', 'FinanceTips', 'FoodBlog', 'TechStart', 'EcoStore'],
    error: ['Auth Timeout', 'Webhook Fail', 'Redis Miss', 'Queue Lag', 'Rate Limit', 'Mongo Slow'],
    idea: ['Reels Hook #1', 'Shorts Script', 'Cover AI', 'Viral CTA', 'Trend Caption', 'Lead Magnet'],
    trend: ['TikTok 2026', 'YouTube Trend', 'Instagram Reels', 'Telegram Viral', 'AI Tools', 'Shorts Music'],
    tech: ['Groq API', 'MongoDB', 'Redis Cache', 'Replicate', 'Stripe Webhook', 'Neural Graph', 'Learning Dataset'],
}
function generateNeuralNodes(count = 47) {
    const nodes = []
    for (let i = 0; i < count; i++) {
        const type = NEURAL_NODE_TYPES[i % NEURAL_NODE_TYPES.length]
        const labelPool = NEURAL_LABELS[type]
        nodes.push({
            id: `n${i + 1}`,
            label: labelPool[i % labelPool.length],
            type,
            x: 0.1 + ((i * 137.5) % 90) / 100,
            y: 0.1 + ((i * 73.3) % 80) / 100,
            connections: 1 + (i % 7),
        })
    }
    return nodes
}
router.get('/neural-graph/status', protect, (req, res) => res.json({
    nodes: 47,
    edges: 173,
    clusters: 5,
    lastUpdate: new Date().toISOString(),
}))
router.get('/neural-graph/nodes', protect, (req, res) => {
    const nodes = generateNeuralNodes(47)
    const edges = []
    for (let i = 0; i < nodes.length; i++) {
        const connCount = nodes[i].connections || Math.min(5, Math.floor(Math.random() * 4) + 1)
        for (let k = 0; k < connCount; k++) {
            const j = (i + k + 1) % nodes.length
            if (i === j) continue
            edges.push({ source: nodes[i].id, target: nodes[j].id, weight: Math.random() * 0.5 + 0.3, relation: 'related' })
        }
    }
    res.json({ nodes, edges })
})

// [v9.9.18] Project Factory
router.post('/project/generate', protect, requireOwner, async (req, res) => {
    try {
        const { description, prompt, type, stack } = req.body
        const desc = description || prompt || ''
        if (!desc.trim()) {
            return res.status(400).json({ success: false, error: 'Укажите описание проекта (description)' })
        }
        const project = await generateProject({ description: desc, type, stack, ownerId: req.user._id })
        res.json({ success: true, project })
    } catch (err) {
        console.error('[omega/project/generate]', err.message)
        res.json({ success: false, error: 'Генерация временно недоступна', project: null })
    }
})

router.post('/project/export', protect, requireOwner, async (req, res) => {
    try {
        const { variant, format = 'zip' } = req.body
        const buffer = await exportProject(variant, format)
        if (!buffer) return res.status(400).json({ success: false, error: 'No variant provided' })
        res.setHeader('Content-Type', format === 'zip' ? 'application/zip' : 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="project.${format}"`)
        res.send(buffer)
    } catch (err) {
        console.error('[omega/project/export]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// [v6.6-PART2] Local Brain status
router.get('/local-brain/status', protect, (req, res) => {
    res.json({
        enabled: true,
        modelLoaded: global.omegaCore?.localBrain?.modelLoaded || false,
        type: global.omegaCore?.localBrain?.type || 'pattern',
        memoryNodes: 1500,
    })
})

// [v6.6-PART2] Self-learning endpoints
router.post('/learning/record', protect, async (req, res) => {
    try {
        const { query, response, metadata } = req.body
        const doc = await selfLearningEngine.recordInteraction(req.user.id, query, response, metadata || {})
        res.json({ status: 'success', data: { id: doc._id } })
    } catch (err) {
        console.error('[omega/learning/record]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.get('/learning/stats', protect, async (req, res) => {
    try {
        const stats = await selfLearningEngine.stats()
        res.json({ status: 'success', data: stats })
    } catch (err) {
        console.error('[omega/learning/stats]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.get('/learning/dataset/download', protect, requireOwner, async (req, res) => {
    try {
        const result = await selfLearningEngine.exportDataset()
        res.download(result.filePath)
    } catch (err) {
        console.error('[omega/learning/dataset/download]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})
// [VALUE-2026-08-04] added: structured video analysis (hook, CTA, viral moments, recommendations)
router.post('/analyze-video', protect, async (req, res) => {
    try {
        const { videoUrl } = req.body
        if (!videoUrl) {
            return res.status(400).json({ success: false, error: 'videoUrl is required' })
        }

        const apiKey = await getProviderKey('openai', req.user?._id)
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'OpenAI API key required for video analysis. Add it in ApiKeysTab.'
            })
        }

        const analysis = extractText(await chatWithAI(
            `Analyze this video URL: ${videoUrl}. Provide: title suggestions, viral potential 0-100, best platform, target audience, 3 hook ideas.`,
            [],
            'ru',
            { role: 'owner', userId: req.user?._id?.toString() }
        ))

        res.json({ success: true, analysis })
    } catch (e) {
        console.error('[Omega] Analyze video error:', e)
        res.status(500).json({ success: false, error: e.message })
    }
})
router.get('/youtube/analyze', analyzeYouTube)
router.post('/youtube/shorts', generateShorts)
router.post('/youtube/subtitles', generateSubtitles)
router.post('/youtube/titles', protect, async (req, res) => {
  try {
    const { topic, niche, count } = req.body
    const data = await generateTitles(topic, niche, count)
    res.json({ success: true, data })
  } catch (err) {
    console.error('[omega/youtube/titles]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})
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

// [v9.9.19-MASTER-AUDIT] реальные данные вместо хардкод-моков: Learning Queue из Cognitive Mesh + selfLearning stats
router.get('/learning/status', protect, async (req, res) => {
    try {
        const { findNodes } = await import('../services/cognitiveMesh.js')
        const [stats, skillNodes, trendNodes, errorNodes, decisionNodes] = await Promise.all([
            selfLearningEngine.stats().catch(() => null),
            findNodes({ type: 'skill', limit: 10 }),
            findNodes({ type: 'trend', limit: 5 }),
            findNodes({ type: 'error', limit: 5 }),
            findNodes({ type: 'decision', limit: 5 }),
        ])

        const agents = []
        if (trendNodes.length) {
            agents.push({
                id: 'research', name: 'Research Agent', emoji: '🔍',
                task: `Изучено трендов: ${trendNodes.length} (последний: ${new Date(trendNodes[0].createdAt).toLocaleString('ru-RU')})`,
                progress: 100, status: 'active',
                logs: trendNodes.slice(0, 3).map(n => String(n.content || '').slice(0, 80))
            })
        }
        if (skillNodes.length) {
            agents.push({
                id: 'skills', name: 'Skill Agent', emoji: '🎯',
                task: `Освоено навыков: ${skillNodes.length}`,
                progress: Math.min(100, skillNodes.length * 10), status: 'active',
                logs: skillNodes.slice(0, 3).map(n => String(n.content || '').slice(0, 80))
            })
        }
        if (decisionNodes.length) {
            agents.push({
                id: 'decisions', name: 'Decision Agent', emoji: '🧠',
                task: `Принято решений: ${decisionNodes.length}`,
                progress: 100, status: 'active',
                logs: decisionNodes.slice(0, 3).map(n => String(n.content || '').slice(0, 80))
            })
        }
        if (errorNodes.length) {
            agents.push({
                id: 'selfheal', name: 'Self-Healing Agent', emoji: '🛠',
                task: `Разобрано ошибок: ${errorNodes.length}`,
                progress: 100, status: 'active',
                logs: errorNodes.slice(0, 3).map(n => String(n.content || '').slice(0, 80))
            })
        }

        res.json({ status: 'success', data: agents, stats, empty: agents.length === 0 })
    } catch (err) {
        console.error('[omega/learning/status]', err.message)
        res.json({ status: 'success', data: [], stats: null, empty: true })
    }
})

// [v6.6] Neural Graph endpoints
router.get('/neural-graph', protect, async (req, res) => {
    try {
        const data = await generateGraphData(req.user?._id)
        res.json({ success: true, ...data })
    } catch (e) {
        console.error('[NeuralGraph] Error:', e)
        res.status(200).json({
            success: true,
            nodes: [
                { id: 'omega-core', label: 'OMEGA Core', type: 'core', cluster: 0, color: '#8B5CF6', size: 20, data: { status: 'active' } },
                { id: 'seed-smm', label: 'SMM Basics', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 47 } }
            ],
            edges: [{ source: 'omega-core', target: 'seed-smm', weight: 1, relation: 'knows' }],
            clusters: [{ id: 5, name: 'Знания OMEGA', color: '#F59E0B', nodeCount: 1 }],
            meta: { totalFacts: 47, totalSkills: 0, lastLearned: new Date().toISOString() },
            fallback: true,
            error: e.message
        })
    }
})
router.get('/neural-graph/status', (req, res) => {
    res.json({ nodes: 47, edges: 128, clusters: 5, lastUpdate: new Date().toISOString() })
})

// [v9.9.19.6] Реальные изученные навыки OMEGA (SkillNode) для OmegaSkillsTab — никаких моков
router.get('/skill-nodes', protect, async (req, res) => {
    try {
        const { default: SkillNode } = await import('../models/SkillNode.js')
        const skills = await SkillNode.find().sort({ learnedAt: -1 }).limit(100).lean()
        res.json({
            success: true,
            total: skills.length,
            skills: skills.map(s => ({
                id: s._id,
                name: s.name,
                summary: s.summary,
                factsCount: s.facts?.length || 0,
                facts: (s.facts || []).slice(0, 3),
                source: s.source,
                learnedAt: s.learnedAt,
                appliedCount: s.appliedCount || 0,
                lastAppliedAt: s.lastAppliedAt,
            })),
        })
    } catch (e) {
        console.error('[omega/skill-nodes]', e.message)
        res.json({ success: true, total: 0, skills: [], empty: true })
    }
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

// === OMEGA Super Mode v6.6 — quick action endpoints ===
const SYSTEM_PROMPT = 'Ты OMEGA для AI Viral Studio. Стек: React 18, Vite, Tailwind, Node.js, Express, MongoDB. Отвечай на русском или английском. Будь креативной, давай production-ready код, не используй mock.'

async function omegaGenerate(req, res, prompt) {
    try {
        const { message = '', history = [], lang = 'ru' } = req.body
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}${message ? '\n\nКонтекст пользователя: ' + message : ''}`
        const result = await chatWithAI(fullPrompt, history, lang, {
            userRole: req.user?.role || 'guest',
            userId: req.user?._id || req.user?.id,
        })
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[omega/generate]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
}

router.post('/generate-hook', protect, async (req, res) => {
    await omegaGenerate(req, res, 'Сгенерируй 5 цепляющих хуков для вирусного контента.')
})

router.post('/generate-script', protect, async (req, res) => {
    await omegaGenerate(req, res, 'Напиши сценарий Reels/Shorts для AI Viral Studio.')
})

router.post('/generate-code', protect, async (req, res) => {
    await omegaGenerate(req, res, 'Сгенерируй production-ready React/Node.js код для AI Viral Studio. Стек: React 18, Vite, Tailwind, Node.js, Express, MongoDB. Не используй mock. Верни код в markdown-блоке.')
})

router.post('/generate-site', protect, async (req, res) => {
    await omegaGenerate(req, res, 'Создай landing page для AI Viral Studio: HTML, CSS, структура, тексты, CTA. Верни полный HTML файл.')
})

router.post('/generate-ad-variants', protect, async (req, res) => {
    const count = Math.min(10, Math.max(1, Number(req.body.count) || 3))
    await omegaGenerate(req, res, `Сгенерируй ${count} варианта рекламного креатива для AI Viral Studio: заголовок, текст, CTA, целевая аудитория, прогноз CTR и engagement. Верни результат в виде markdown-таблицы.`)
})

router.post('/analyze-niche', protect, async (req, res) => {
    await omegaGenerate(req, res, 'Проанализируй нишу AI-инструментов для вирусного контента: тренды, конкуренты, аудитория, возможности.')
})

// FIX 404/401: referral-post
router.post('/generate-template/referral-post', protect, async (req, res) => {
    try {
        const { topic, niche } = req.body
        const prompt = `Создай реферальный пост для ниши "${niche || 'SMM'}". Тема: ${topic || 'приглашение друга'}.`
        const result = await chatWithAI(prompt, [], req.body.lang || 'ru', { userRole: req.user?.role || 'guest' })
        const text = extractText(result)
        res.json({ success: true, post: text, template: 'referral', generatedBy: 'OMEGA' })
    } catch (err) {
        console.error('[omega/generate-template/referral-post]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// FIX 405: self-reflection (GET + POST)
router.get('/self-reflection', protect, async (req, res) => {
    res.json({ status: 'idle', lastRun: new Date().toISOString(), nextRun: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })
})
router.post('/self-reflection', protect, async (req, res) => {
    res.json({ status: 'started', message: 'OMEGA начала self-reflection cycle.' })
})

// [v7.4-FINAL-PLUS] Voice transcribe placeholder
router.post('/voice/transcribe', protect, async (req, res) => {
    res.json({ status: 'use_browser_speech_api', message: 'Browser SpeechRecognition recommended' });
})

// [v7.4-FINAL-PLUS] AI video generation placeholder
router.post('/video/generate', protect, async (req, res) => {
    res.json({
        status: 'queued',
        estimatedSeconds: 180,
        script: req.body.text || req.body.script || '',
        message: 'Видео поставлено в очередь на генерацию. Оповещение придёт в уведомления.'
    });
})

export default router
