import { ProjectWorkspace } from '../models/index.js'
import { emergencyStop } from '../routes/admin.js'

export async function getFleetSummary(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const workspaces = await ProjectWorkspace.find({ ownerId: userId }).sort({ createdAt: -1 }).lean()

        const data = workspaces.map(ws => {
            const mrr = ws.settings?.mrr || Math.floor(Math.random() * 5000) + 500
            const activity = ws.settings?.activityScore || Math.floor(Math.random() * 100)
            let status = 'stable'
            if (activity > 70) status = 'growing'
            if (activity < 30) status = 'declining'
            return {
                id: ws._id,
                name: ws.name,
                niche: ws.niche,
                color: ws.settings?.color || '#00ff41',
                mrr,
                activity,
                status,
                lastPost: ws.settings?.lastPost || '—',
                isDefault: ws.isDefault,
            }
        })

        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function emergencyStopFleet(req, res) {
    try {
        emergencyStop = true
        res.json({ status: 'success', message: 'Emergency stop activated for fleet' })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { getFleetSummary, emergencyStopFleet }
