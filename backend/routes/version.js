import express from 'express'

const router = express.Router()

const CHANGELOG = [
    'v6.5.5 — UI/UX Supreme: luxury sidebar, mobile bottom nav, glassmorphism v2, voice input.',
    'v6.5.5 — Auto-Features: auto-onboarding, auto-reports, auto-ticket helper, upgrade nudge.',
    'v6.5.5 — Production: version API, offline queue, failover service, graceful degradation.',
    'v6.5.5 — Competitor Radar: 6-axis comparison and 8 unique AI Viral Studio features.',
]

const FEATURES = ['neural_graph', 'swarm', 'autofix', 'voice_input', 'auto_report', 'offline_queue', 'competitor_radar', 'auto_onboarding']

router.get('/', (req, res) => {
    res.json({
        version: '6.5.5',
        build: 202608061600,
        requiredFrontend: '6.5.5',
        features: FEATURES,
    })
})

router.get('/changelog', (req, res) => {
    res.json({
        version: '6.5.5',
        changelog: CHANGELOG,
    })
})

export default router
