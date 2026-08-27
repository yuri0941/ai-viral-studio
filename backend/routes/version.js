import express from 'express'
import { createRequire } from 'module'

// [v9.9.19.2-UX-HOTFIX-v4] реальная версия из package.json вместо хардкода 7.0.0
const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const router = express.Router()

const VERSION = pkg.version || '9.9.19'
const BUILD = Number(process.env.BUILD_NUMBER) || 202608110700

const CHANGELOG = [
    'v9.9.19.2 — UX-HOTFIX: модалка обновления не блокирует приложение (15 сек → отложено), PWA update = cache clear + reload.',
    'v9.9.19.2 — Neural Graph: начальная раскладка + fitToView, монохром, мобильная панель (поиск/фильтры/статистика).',
    'v9.9.19.2 — AI fallback: Groq 70b → DeepSeek → OpenAI → Groq 8b (слабая модель — последняя), лог [AI] provider/model.',
    'v9.9.19.2 — Ключи: приоритет Кабинет > env, выключенный в кабинете ключ = запрет, Key Health Monitor.',
    'v9.9.19.6 — OMEGA Autonomy Luxe: команды с доказательством, люкс-посты, навыки, память в MongoDB, ночное самообучение.',
]

const FEATURES = ['neural_graph', 'swarm', 'autofix', 'voice_input', 'auto_report', 'offline_queue', 'competitor_radar', 'auto_onboarding', 'pwa_ota', 'capacitor_ota', 'tauri_updater']

router.get('/', (req, res) => {
    res.json({
        version: VERSION,
        build: BUILD,
        requiredFrontend: VERSION,
        features: FEATURES,
    })
})

router.get('/changelog', (req, res) => {
    res.json({
        version: VERSION,
        changelog: CHANGELOG,
    })
})

// [OWNER-OMEGA] структурированный changelog из БД (редактируется из кабинета владельца).
// Пустая БД → entries: [] (фронт показывает встроенный changelog.json).
router.get('/structured-changelog', async (req, res) => {
    try {
        const { default: ChangelogVersion } = await import('../models/ChangelogVersion.js')
        const entries = await ChangelogVersion.find().sort({ createdAt: -1 }).limit(20).lean()
        res.json({
            success: true,
            entries: entries.map(e => ({ version: e.version, date: e.date, items: e.items || [] })),
        })
    } catch (err) {
        console.error('[version/structured-changelog]', err.message)
        res.json({ success: true, entries: [] }) // публичный роут — не светим ошибку, фронт на fallback
    }
})

export default router
