import express from 'express'
import { protect } from '../middleware/auth.js'
import { generateModule, listModules, getModule, approveModule, deployModule } from '../ai/omega/omegaDevStudio.js'

const router = express.Router()

function ownerOnly(req, res, next) {
    if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Only owner' })
    next()
}

router.post('/dev-studio/generate', protect, async (req, res) => {
    try {
        const { spec } = req.body
        if (!spec?.name) return res.status(400).json({ status: 'error', message: 'spec.name required' })
        const userId = req.user?._id || req.user?.id
        const result = await generateModule(spec, userId)
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[dev-studio/generate]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/dev-studio/modules', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const modules = await listModules(userId)
        res.json({ status: 'success', data: modules })
    } catch (err) {
        console.error('[dev-studio/modules]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/dev-studio/:id/approve', protect, ownerOnly, async (req, res) => {
    try {
        const mod = await approveModule(req.params.id)
        if (!mod) return res.status(404).json({ status: 'error', message: 'Module not found' })
        res.json({ status: 'success', data: mod })
    } catch (err) {
        console.error('[dev-studio/approve]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/dev-studio/:id/deploy', protect, ownerOnly, async (req, res) => {
    try {
        const result = await deployModule(req.params.id)
        res.json({ status: 'success', data: result })
    } catch (err) {
        console.error('[dev-studio/deploy]', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
