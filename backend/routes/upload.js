import express from 'express'
import multer from 'multer'
import { optimizeUpload } from '../services/imageOptimizer.js'
import { protect } from '../middleware/auth.js'
import { mkdir, writeFile } from 'fs/promises'
import { extname } from 'path'
import crypto from 'crypto'

const IMAGE_UPLOAD_LIMIT = 10 * 1024 * 1024
const MEDIA_UPLOAD_LIMIT = 250 * 1024 * 1024

const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_UPLOAD_LIMIT } })
const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: MEDIA_UPLOAD_LIMIT } })

const router = express.Router()

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg'])
const HEIC_MIMES = new Set(['image/heic', 'image/heif'])
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-ms-wmv', 'video/x-matroska', 'video/mpeg'])

function isHeicBuffer(buffer) {
  if (!buffer || buffer.length < 16) return false
  const hasFtyp = buffer.slice(4, 8).toString('ascii') === 'ftyp'
  if (!hasFtyp) return false
  const brand = buffer.slice(8, 12).toString('ascii').toLowerCase()
  return ['heic', 'heix', 'mif1'].includes(brand)
}

async function saveUpload(buffer, userId, ext) {
  const dir = `uploads/${userId}`
  await mkdir(dir, { recursive: true })
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const filepath = `${dir}/${filename}`
  await writeFile(filepath, buffer)
  return `/uploads/${userId}/${filename}`
}

async function handleMediaUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No media provided' })
    }

    const mime = (req.file.mimetype || '').toLowerCase()
    const originalExt = extname(req.file.originalname || '').toLowerCase().slice(1)
    const userId = req.user?._id || req.user?.id || 'unknown'

    // [v9.9.19.15.14] HEIC / HEIF iPhone photos → JPEG
    if (HEIC_MIMES.has(mime) || isHeicBuffer(req.file.buffer)) {
      try {
        const convert = await import('heic-convert').then(m => m.default || m)
        const jpegBuffer = await convert({ buffer: req.file.buffer, format: 'JPEG', quality: 0.92 })
        const optimized = await optimizeUpload(jpegBuffer, { format: 'jpeg', quality: 85 })
        const publicUrl = await saveUpload(optimized.buffer, userId, 'jpg')
        return res.json({ success: true, url: publicUrl, mediaType: 'image', size: optimized.buffer.length })
      } catch (err) {
        console.error('[upload:media] HEIC conversion failed:', err.message)
        return res.status(400).json({ success: false, error: 'heic_conversion_failed', hint: 'Не удалось сконвертировать HEIC. Сохраните фото как JPEG и попробуйте снова.' })
      }
    }

    // [v9.9.19.15.14] images → sharp optimization
    if (IMAGE_MIMES.has(mime) || mime.startsWith('image/')) {
      const result = await optimizeUpload(req.file.buffer, {
        format: req.body.format || 'webp',
        quality: Number(req.body.quality) || 80,
        width: req.body.width ? Number(req.body.width) : null,
      })
      const ext = result.format === 'jpeg' ? 'jpg' : result.format
      const publicUrl = await saveUpload(result.buffer, userId, ext)
      return res.json({
        success: true,
        url: publicUrl,
        mediaType: 'image',
        size: result.buffer.length,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        savedPercent: result.savedPercent,
        format: result.format,
      })
    }

    // [v9.9.19.15.14] video → save as-is
    if (VIDEO_MIMES.has(mime) || mime.startsWith('video/')) {
      const ext = originalExt || (mime === 'video/quicktime' ? 'mov' : 'mp4')
      const publicUrl = await saveUpload(req.file.buffer, userId, ext)
      return res.json({ success: true, url: publicUrl, mediaType: 'video', size: req.file.buffer.length })
    }

    return res.status(400).json({ success: false, error: 'unsupported_format', hint: `Unsupported media type: ${mime}` })
  } catch (err) {
    console.error('[upload:media]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// [P21] added: image upload with sharp optimization
// [v9.9.19.15.12] save optimized image to /uploads and return a file URL
// [v9.9.19.15.14] kept for backward compatibility; now accepts HEIC and returns mediaType
router.post('/image', protect, uploadImage.single('image'), async (req, res) => {
  return handleMediaUpload(req, res)
})

// [v9.9.19.15.14] universal media upload: images (incl. HEIC) + video, up to 250 MB
router.post('/media', protect, uploadMedia.single('media'), async (req, res) => {
  return handleMediaUpload(req, res)
})

export default router
