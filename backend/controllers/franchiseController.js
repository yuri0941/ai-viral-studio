import franchiseService from '../services/franchiseGenerator.js'

export async function checkReady(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const result = await franchiseService.isReady(userId)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function generateKit(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { projectId, brandName, niche, city, investment, lang } = req.body
        if (!brandName) return res.status(400).json({ status: 'error', message: 'brandName is required' })

        const result = await franchiseService.generateKit({ userId, projectId, brandName, niche, city, investment, lang })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listKits(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await franchiseService.listKits(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function downloadKit(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const kit = await franchiseService.getKitById(req.params.id, userId)
        if (!kit) return res.status(404).json({ status: 'error', message: 'Kit not found' })

        const archive = await franchiseService.buildZipArchive(kit)
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="franchise-${kit.brandName}.json"`)
        res.json({ status: 'success', archive })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function sendToCandidates(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { recipients } = req.body
        const result = await franchiseService.sendToCandidates({ kitId: req.params.id, userId, recipients })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { checkReady, generateKit, listKits, downloadKit, sendToCandidates }
