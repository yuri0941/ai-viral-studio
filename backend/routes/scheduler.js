import express from 'express'

const router = express.Router()

// Placeholder routes
router.get('/posts', (req, res) => {
    res.json({ status: 'success', message: 'Scheduler posts' })
})

router.post('/posts', (req, res) => {
    res.json({ status: 'success', message: 'Create scheduled post' })
})

export default router