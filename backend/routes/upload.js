import express from 'express'
import multer from 'multer'
import { optimizeUpload } from '../services/imageOptimizer.js'
import { protect } from '../middleware/auth.js'
import { mkdir, writeFile } from 'fs/promises'
import { extname } from 'path'
import crypto from 'crypto'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = express.Router()

// [P21] added: image upload with sharp optimization
// [v9.9.19.15.12] save optimized image to /uploads and return a file URL
// so VK/media publishers can fetch it as a normal HTTP/relative URL.
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

        const userId = req.user?._id || req.user?.id || 'unknown'
        const dir = `uploads/${userId}`
        await mkdir(dir, { recursive: true })

        const ext = result.format === 'jpeg' ? 'jpg' : result.format
        const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
        const filepath = `${dir}/${filename}`
        await writeFile(filepath, result.buffer)

        const publicUrl = `/uploads/${userId}/${filename}`
        res.json({
            success: true,
            url: publicUrl,
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
