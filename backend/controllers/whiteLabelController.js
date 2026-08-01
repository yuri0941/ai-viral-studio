import { WhiteLabel } from '../models/index.js'

export async function getMyWhiteLabel(req, res) {
    try {
        const config = await WhiteLabel.findOne({ agencyId: req.user._id }).lean()
        res.json({ status: 'success', data: config })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function upsertWhiteLabel(req, res) {
    try {
        if (req.user.subscription !== 'agency' && req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'White-label доступен только на Agency тарифе' })
        }
        const { brandName, domain, logoUrl, primaryColor, secondaryColor, faviconUrl, isActive } = req.body
        const config = await WhiteLabel.findOneAndUpdate(
            { agencyId: req.user._id },
            {
                agencyId: req.user._id,
                brandName,
                domain,
                logoUrl,
                primaryColor,
                secondaryColor,
                faviconUrl,
                isActive: isActive !== false,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        res.json({ status: 'success', data: config })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function previewWhiteLabel(req, res) {
    try {
        const { brandName, domain, logoUrl, primaryColor, secondaryColor } = req.body
        res.json({
            status: 'success',
            data: {
                brandName: brandName || 'Your Brand',
                domain: domain || 'agency.example.com',
                logoUrl,
                primaryColor: primaryColor || '#8b5cf6',
                secondaryColor: secondaryColor || '#00ff41',
            },
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listAgencyWhiteLabels(req, res) {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'Forbidden' })
        }
        const configs = await WhiteLabel.find({}).populate('agencyId', 'name email').lean()
        res.json({ status: 'success', data: configs })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { getMyWhiteLabel, upsertWhiteLabel, previewWhiteLabel, listAgencyWhiteLabels }
