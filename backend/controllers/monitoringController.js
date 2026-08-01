import selfHealingService from '../services/selfHealing.js'
import crisisDetectionService from '../services/crisisDetection.js'
import selfReflectionService from '../services/selfReflection.js'
import { OwnerSettings } from '../models/index.js'

export async function getSelfHealingStatus(req, res) {
    try {
        const data = await selfHealingService.getSelfHealingStatus()
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function toggleAutoHeal(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const { enabled } = req.body
        const data = await selfHealingService.toggleAutoHeal(ownerId, enabled)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function triggerSelfHealTick(req, res) {
    try {
        await selfHealingService.runHealingTick()
        res.json({ status: 'success', message: 'Self-healing tick triggered' })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listCrises(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const [crises, stats] = await Promise.all([
            crisisDetectionService.listCrises(ownerId),
            crisisDetectionService.getCrisisStats(ownerId),
        ])
        res.json({ status: 'success', data: { crises, stats } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function analyzeCrisis(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const { projectId, platform, comments } = req.body
        const data = await crisisDetectionService.analyzeComments({ ownerId, projectId, platform, comments })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function resolveCrisis(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const { response, autoActions } = req.body
        const data = await crisisDetectionService.resolveCrisis(req.params.id, ownerId, { response, autoActions })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function rejectCrisis(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const data = await crisisDetectionService.rejectCrisis(req.params.id, ownerId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getSelfReflectionReport(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const data = await selfReflectionService.analyzeLast24Hours(ownerId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function sendSelfReflectionReport(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const data = await selfReflectionService.sendMorningReport(ownerId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getCrisisSources(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const sources = await crisisDetectionService.getConnectedSources(ownerId)
        res.json({ status: 'success', data: sources })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default {
    getSelfHealingStatus,
    toggleAutoHeal,
    triggerSelfHealTick,
    listCrises,
    analyzeCrisis,
    resolveCrisis,
    rejectCrisis,
    getSelfReflectionReport,
    sendSelfReflectionReport,
    getCrisisSources,
}
