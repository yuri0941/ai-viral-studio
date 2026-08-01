import express from 'express'
import { protect } from '../middleware/auth.js'
import ScheduledPost from '../models/ScheduledPost.js'
import { repurposeContent } from '../services/contentRepurposer.js'

const router = express.Router()

// Get all scheduled posts for current user
router.get('/posts', protect, async (req, res) => {
    try {
        const posts = await ScheduledPost.find({ userId: req.user._id }).sort({ scheduledAt: -1 }).lean()
        res.json({ status: 'success', data: posts })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Create scheduled post
router.post('/posts', protect, async (req, res) => {
    try {
        const post = await ScheduledPost.create({
            ...req.body,
            userId: req.user._id,
            status: req.body.status || 'scheduled',
        })
        res.json({ status: 'success', data: post })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Update scheduled post
router.patch('/posts/:id', protect, async (req, res) => {
    try {
        const post = await ScheduledPost.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: req.body },
            { new: true }
        )
        if (!post) return res.status(404).json({ status: 'error', message: 'Post not found' })
        res.json({ status: 'success', data: post })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Delete scheduled post
router.delete('/posts/:id', protect, async (req, res) => {
    try {
        const post = await ScheduledPost.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
        if (!post) return res.status(404).json({ status: 'error', message: 'Post not found' })
        res.json({ status: 'success', message: 'Post deleted' })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Repurpose a post into multiple formats
router.post('/posts/:id/repurpose', protect, async (req, res) => {
    try {
        const result = await repurposeContent(req.user._id, req.params.id, req.body)
        if (result.status === 'error') {
            return res.status(400).json({ status: 'error', ...result })
        }
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
