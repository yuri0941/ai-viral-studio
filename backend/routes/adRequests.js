import express from 'express'
import { AdRequest } from '../models/index.js'

const router = express.Router()

// GET /api/ad-requests — list (optionally filter by status)
router.get('/', async (req, res) => {
    try {
        const { status, clientId, assignedTo } = req.query
        const filter = {}
        if (status) filter.status = status
        if (clientId) filter.clientId = clientId
        if (assignedTo) filter.assignedTo = assignedTo

        const requests = await AdRequest.find(filter).sort({ createdAt: -1 }).limit(100)
        res.json({ status: 'success', data: { requests } })
    } catch (err) {
        console.error('GET /ad-requests error:', err)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// GET /api/ad-requests/:id — single request
router.get('/:id', async (req, res) => {
    try {
        const request = await AdRequest.findById(req.params.id)
        if (!request) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: { request } })
    } catch (err) {
        console.error('GET /ad-requests/:id error:', err)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// POST /api/ad-requests — create from client chat widget
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            clientName,
            clientEmail,
            clientId,
            budget,
            platform,
            targetAudience,
            deadline,
            files,
            preferredChannel,
            messages,
        } = req.body

        const request = await AdRequest.create({
            title: title || `Заявка от ${clientName || 'гостя'}`,
            description: description || '',
            clientName: clientName || 'Гость',
            clientEmail: clientEmail || '',
            clientId: clientId || null,
            budget: Number(budget) || 0,
            platform: platform || '',
            targetAudience: targetAudience || '',
            status: 'new',
            files: Array.isArray(files) ? files.map(f => ({ url: f.url, name: f.name, type: f.type })) : [],
            metadata: {
                deadline: deadline || '',
                preferredChannel: preferredChannel || 'online',
                chatHistory: Array.isArray(messages) ? messages : [],
            },
        })

        res.status(201).json({ status: 'success', data: { request } })
    } catch (err) {
        console.error('POST /ad-requests error:', err)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// PATCH /api/ad-requests/:id — update status / assignee / notes
router.patch('/:id', async (req, res) => {
    try {
        const allowed = ['status', 'assignedTo', 'title', 'description', 'budget', 'platform', 'targetAudience']
        const update = {}
        allowed.forEach(key => { if (req.body[key] !== undefined) update[key] = req.body[key] })

        if (req.body.metadata && typeof req.body.metadata === 'object') {
            const request = await AdRequest.findById(req.params.id)
            if (request) {
                update.metadata = { ...request.metadata, ...req.body.metadata }
            }
        }

        const request = await AdRequest.findByIdAndUpdate(req.params.id, update, { new: true })
        if (!request) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: { request } })
    } catch (err) {
        console.error('PATCH /ad-requests/:id error:', err)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// DELETE /api/ad-requests/:id
router.delete('/:id', async (req, res) => {
    try {
        const request = await AdRequest.findByIdAndDelete(req.params.id)
        if (!request) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: { deleted: true } })
    } catch (err) {
        console.error('DELETE /ad-requests/:id error:', err)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
