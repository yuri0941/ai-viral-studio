import express from 'express'
import multer from 'multer'
import { optimizeUpload } from '../services/imageOptimizer.js'
import { protect } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = express.Router()

// [P21] added: image upload with sharp optimization
router.post('/image', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' })
        }
        const result = await optimizeUpload(req.file.buffer, {
            format: req.body.format || 'webp',
            quality: Number(req.body.quality) || 80,
            width: req.body.width ? Number(req.body.width) : null,
        })
        const base64 = result.buffer.toString('base64')
        res.json({
            success: true,
            url: `data:image/${result.format};base64,${base64}`,
            originalSize: result.originalSize,
            optimizedSize: result.optimizedSize,
            savedPercent: result.savedPercent,
            format: result.format,
        })
    } catch (err) {
        console.error('[upload:image]', err.message)
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
