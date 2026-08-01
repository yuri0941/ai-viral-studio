import express from 'express'
import { Waitlist } from '../models/index.js'

const router = express.Router()

router.post('/waitlist', async (req, res) => {
    try {
        const { email, source = 'producthunt', referredBy, utm = {} } = req.body
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required' })
        }
        const entry = await Waitlist.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { email: email.toLowerCase().trim(), source, referredBy, utm },
            { upsert: true, new: true }
        )
        const count = await Waitlist.countDocuments()
        res.json({ success: true, data: entry, total: count })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Email already registered' })
        }
        res.status(500).json({ success: false, message: err.message })
    }
})

router.get('/waitlist/count', async (req, res) => {
    try {
        const count = await Waitlist.countDocuments()
        res.json({ success: true, data: { count } })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
