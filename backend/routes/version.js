import express from 'express'

const router = express.Router()

const CHANGELOG = [
    'v7.0.0 — Cleanup: removed demo mode, realistic fallback data, graceful degradation v3.',
    'v7.0.0 — Failover: service health pings, offline queue, MongoDB/AI/payment failure messages.',
    'v7.0.0 — OTA Updates: version API, UpdateModal, PWA force update, Capacitor/Tauri updaters.',
    'v7.0.0 — Download Center: APK/EXE/DMG download page with QR, changelog and version history.',
    'v7.0.0 — Neural Graph + Swarm + AutoFix: production-ready AI core and autonomous brain.',
]

const FEATURES = ['neural_graph', 'swarm', 'autofix', 'voice_input', 'auto_report', 'offline_queue', 'competitor_radar', 'auto_onboarding', 'pwa_ota', 'capacitor_ota', 'tauri_updater']

router.get('/', (req, res) => {
    res.json({
        version: '7.0.0',
        build: 202608071300,
        requiredFrontend: '7.0.0',
        features: FEATURES,
    })
})

router.get('/changelog', (req, res) => {
    res.json({
        version: '7.0.0',
        changelog: CHANGELOG,
    })
})

export default router
