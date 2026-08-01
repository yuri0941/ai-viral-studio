import { ProjectWorkspace } from '../models/index.js'

export async function listWorkspaces(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const workspaces = await ProjectWorkspace.find({ ownerId }).sort({ isDefault: -1, createdAt: -1 }).lean()
        res.json({ status: 'success', data: workspaces })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getWorkspace(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const workspace = await ProjectWorkspace.findOne({ _id: req.params.id, ownerId }).lean()
        if (!workspace) return res.status(404).json({ status: 'error', message: 'Workspace not found' })
        res.json({ status: 'success', data: workspace })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createWorkspace(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const { name, niche, description, brandVoice, connectedAccounts, settings, team } = req.body
        if (!name) return res.status(400).json({ status: 'error', message: 'Name is required' })

        const count = await ProjectWorkspace.countDocuments({ ownerId })
        let isDefault = false
        if (count === 0) {
            isDefault = true
        } else if (req.body.isDefault) {
            await ProjectWorkspace.updateMany({ ownerId }, { isDefault: false })
            isDefault = true
        }

        const workspace = await ProjectWorkspace.create({
            ownerId,
            name,
            niche: niche || '',
            description: description || '',
            brandVoice: brandVoice || {},
            connectedAccounts: connectedAccounts || [],
            settings: settings || {},
            team: team || [],
            isDefault,
        })
        res.status(201).json({ status: 'success', data: workspace })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function updateWorkspace(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const { name, niche, description, brandVoice, connectedAccounts, settings, team } = req.body
        const update = { name, niche, description, brandVoice, connectedAccounts, settings, team }
        for (const key of Object.keys(update)) {
            if (update[key] === undefined) delete update[key]
        }

        if (req.body.isDefault === true) {
            await ProjectWorkspace.updateMany({ ownerId }, { isDefault: false })
            update.isDefault = true
        } else if (req.body.isDefault === false) {
            update.isDefault = false
        }

        const workspace = await ProjectWorkspace.findOneAndUpdate(
            { _id: req.params.id, ownerId },
            { $set: update },
            { new: true }
        ).lean()
        if (!workspace) return res.status(404).json({ status: 'error', message: 'Workspace not found' })
        res.json({ status: 'success', data: workspace })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function deleteWorkspace(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        const workspace = await ProjectWorkspace.findOneAndDelete({ _id: req.params.id, ownerId }).lean()
        if (!workspace) return res.status(404).json({ status: 'error', message: 'Workspace not found' })

        if (workspace.isDefault) {
            const next = await ProjectWorkspace.findOne({ ownerId }).sort({ createdAt: -1 })
            if (next) await ProjectWorkspace.findByIdAndUpdate(next._id, { isDefault: true })
        }
        res.json({ status: 'success', data: { deleted: true } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function setDefaultWorkspace(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        await ProjectWorkspace.updateMany({ ownerId }, { isDefault: false })
        const workspace = await ProjectWorkspace.findOneAndUpdate(
            { _id: req.params.id, ownerId },
            { isDefault: true },
            { new: true }
        ).lean()
        if (!workspace) return res.status(404).json({ status: 'error', message: 'Workspace not found' })
        res.json({ status: 'success', data: workspace })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getDefaultWorkspace(ownerId) {
    return ProjectWorkspace.findOne({ ownerId, isDefault: true }).lean() || ProjectWorkspace.findOne({ ownerId }).sort({ createdAt: -1 }).lean()
}

export default {
    listWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setDefaultWorkspace,
    getDefaultWorkspace,
}
