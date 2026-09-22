import express from 'express'
import multer from 'multer'
import { optimizeUpload } from '../services/imageOptimizer.js'
import { protect } from '../middleware/auth.js'
import { getMediaUploadLimitMb, getVideoSettings } from '../models/OwnerSettings.js'
import MediaFile from '../models/MediaFile.js'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { mkdirSync } from 'fs'
import { extname } from 'path'
import crypto from 'crypto'
import { logMemory } from '../utils/memoryLog.js'

const IMAGE_UPLOAD_LIMIT = 10 * 1024 * 1024
const MEDIA_UPLOAD_LIMIT = 250 * 1024 * 1024

const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_UPLOAD_LIMIT } })
// [MEMORY-FIX] /media пишется на диск стримом (diskStorage) — видео до 250 МБ больше
// не поднимается целиком в RAM (multer memoryStorage держал весь файл в heap, Render Free 512MB).
const uploadMedia = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.user?._id || req.user?.id || 'unknown'
      const dir = `uploads/${userId}`
      try { mkdirSync(dir, { recursive: true }); cb(null, dir) } catch (e) { cb(e) }
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase().slice(1) || 'bin'
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`)
    },
  }),
  limits: { fileSize: MEDIA_UPLOAD_LIMIT },
})

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

// [OMEGA-VIDEO ДОП-2] регистрация файла для TTL авто-очистки и счётчика хранилища (best-effort —
// сбой учёта не должен ронять саму загрузку)
async function trackMediaFile(userId, url, sizeBytes, kind) {
  try {
    await MediaFile.findOneAndUpdate(
      { url },
      { $setOnInsert: { userId, url, sizeBytes, kind } },
      { upsert: true }
    )
  } catch (e) {
    console.warn('[upload:media] trackMediaFile failed:', e.message)
  }
}

async function handleMediaUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No media provided' })
    }

    const mime = (req.file.mimetype || '').toLowerCase()
    const originalExt = extname(req.file.originalname || '').toLowerCase().slice(1)
    const userId = req.user?._id || req.user?.id || 'unknown'
    // [MEMORY-FIX] /media приходит с диска (req.file.path), /image — из памяти (req.file.buffer)
    const diskPath = req.file.path || null

    // [OMEGA-VIDEO] лимит веса — из кабинета владельца (OwnerSettings.mediaUploadLimitMb, hot-reload ≤60с)
    const limitMb = await getMediaUploadLimitMb()
    const fileSizeBytes = diskPath ? req.file.size : req.file.buffer.length
    const fileMb = fileSizeBytes / (1024 * 1024)
    if (fileMb > limitMb) {
        if (diskPath) await unlink(diskPath).catch(() => {})
        return res.status(413).json({
            success: false,
            error: 'file_too_large',
            limitMb,
            fileMb: Math.round(fileMb * 10) / 10,
        })
    }

    // [MEMORY-FIX] буфер читаем только там, где он реально нужен (HEIC/sharp); видео остаётся на диске
    const getBuffer = () => diskPath ? readFile(diskPath) : Promise.resolve(req.file.buffer)
    const getHead16 = async () => {
      if (!diskPath) return req.file.buffer
      const { open } = await import('fs/promises')
      const fh = await open(diskPath, 'r')
      try {
        const buf = Buffer.alloc(16)
        await fh.read(buf, 0, 16, 0)
        return buf
      } finally { await fh.close() }
    }

    // [v9.9.19.15.14] HEIC / HEIF iPhone photos → JPEG
    const headBuffer = await getHead16()
    if (HEIC_MIMES.has(mime) || isHeicBuffer(headBuffer)) {
      try {
        const srcBuffer = await getBuffer()
        const convert = await import('heic-convert').then(m => m.default || m)
        const jpegBuffer = await convert({ buffer: srcBuffer, format: 'JPEG', quality: 0.92 })
        const optimized = await optimizeUpload(jpegBuffer, { format: 'jpeg', quality: 85 })
        const publicUrl = await saveUpload(optimized.buffer, userId, 'jpg')
        if (diskPath) await unlink(diskPath).catch(() => {})
        await trackMediaFile(userId, publicUrl, optimized.buffer.length, 'image')
        return res.json({ success: true, url: publicUrl, mediaType: 'image', size: optimized.buffer.length })
      } catch (err) {
        console.error('[upload:media] HEIC conversion failed:', err.message)
        if (diskPath) await unlink(diskPath).catch(() => {})
        return res.status(400).json({ success: false, error: 'heic_conversion_failed', hint: 'Не удалось сконвертировать HEIC. Сохраните фото как JPEG и попробуйте снова.' })
      }
    }

    // [v9.9.19.15.14] images → sharp optimization
    if (IMAGE_MIMES.has(mime) || mime.startsWith('image/')) {
      const srcBuffer = await getBuffer()
      const result = await optimizeUpload(srcBuffer, {
        format: req.body.format || 'webp',
        quality: Number(req.body.quality) || 80,
        width: req.body.width ? Number(req.body.width) : null,
      })
      const ext = result.format === 'jpeg' ? 'jpg' : result.format
      const publicUrl = await saveUpload(result.buffer, userId, ext)
      if (diskPath) await unlink(diskPath).catch(() => {})
      await trackMediaFile(userId, publicUrl, result.buffer.length, 'image')
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
    // [MEMORY-FIX] с диска: файл уже лежит в uploads/<userId>/ (multer записал стримом) — просто отдаём URL
    if (VIDEO_MIMES.has(mime) || mime.startsWith('video/')) {
      if (diskPath) {
        const filename = diskPath.replace(/\\/g, '/').split('/').pop()
        const publicUrl = `/uploads/${userId}/${filename}`
        await trackMediaFile(userId, publicUrl, req.file.size, 'video')
        logMemory(`upload:video ${Math.round(req.file.size / (1024 * 1024))}MB`)
        return res.json({ success: true, url: publicUrl, mediaType: 'video', size: req.file.size })
      }
      const ext = originalExt || (mime === 'video/quicktime' ? 'mov' : 'mp4')
      const publicUrl = await saveUpload(req.file.buffer, userId, ext)
      await trackMediaFile(userId, publicUrl, req.file.buffer.length, 'video')
      return res.json({ success: true, url: publicUrl, mediaType: 'video', size: req.file.buffer.length })
    }

    if (diskPath) await unlink(diskPath).catch(() => {})
    return res.status(400).json({ success: false, error: 'unsupported_format', hint: `Unsupported media type: ${mime}` })
  } catch (err) {
    console.error('[upload:media]', err.message)
    if (req.file?.path) await unlink(req.file.path).catch(() => {})
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

// [OMEGA-VIDEO] актуальный лимит веса для клиента (чип «лимит N МБ» до загрузки)
// [OMEGA-VIDEO ДОП-2] + живые цены AI-действий и TTL хранения (hot-reload ≤60с, кабинет владельца)
router.get('/limits', protect, async (req, res) => {
  const maxMb = await getMediaUploadLimitMb()
  const video = await getVideoSettings()
  // [REAL-DATA З5.3] полный реестр цен действий — клиент показывает цену ДО запуска
  const { getActionPrices, getPackagingLanguages } = await import('../models/OwnerSettings.js')
  const actionPrices = await getActionPrices()
  // [KNOWLEDGE-PACK З3] языки упаковки из кабинета владельца (EN первым), hot-reload ≤60с
  const packagingLanguages = await getPackagingLanguages()
  res.json({
    success: true,
    maxMb,
    videoAnalysisCost: video.videoAnalysisCostCredits,
    coverGenerationCost: video.coverGenerationCostCredits,
    scriptGenerationCost: video.scriptGenerationCostCredits,
    videoStorageTtlHours: video.videoStorageTtlHours,
    // [SMART-TTL З2] таймер бездействия (мин) — клиенту для мягкой подсказки; hot-reload ≤60с
    videoIdleMinutes: video.videoIdleMinutes,
    actionPrices,
    packagingLanguages,
  })
})

// [SMART-TTL З1] событие «результат принят» (обложка скачана/применена к посту, драфт создан):
// исходный видеофайл удаляется немедленно. Только свой файл, обложки (cover-*) не удаляются никогда.
const USED_REASONS = new Set(['cover_download', 'cover_applied', 'script_draft'])
router.post('/used', protect, async (req, res) => {
  try {
    const { url, reason } = req.body || {}
    const userId = (req.user?._id || req.user?.id || '').toString()
    if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'url is required' })
    if (!url.startsWith(`/uploads/${userId}/`) || url.includes('..')) {
      return res.status(403).json({ success: false, error: 'forbidden_url' })
    }
    const { deleteMediaNow } = await import('../services/videoStorage.js')
    const result = await deleteMediaNow({
      videoUrl: url,
      userId,
      reason: USED_REASONS.has(reason) ? reason : 'accepted',
    })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// [SMART-TTL З2] heartbeat «задача на экране»: молчание дольше OwnerSettings.videoIdleMinutes
// (кабинет владельца, hot-reload ≤60с) → крон mediaCleanup удаляет исходник. TTL-потолок поверх.
router.post('/heartbeat', protect, async (req, res) => {
  try {
    const { url } = req.body || {}
    const userId = (req.user?._id || req.user?.id || '').toString()
    if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'url is required' })
    if (!url.startsWith(`/uploads/${userId}/`) || url.includes('..')) {
      return res.status(403).json({ success: false, error: 'forbidden_url' })
    }
    const { markMediaHeartbeat } = await import('../services/videoStorage.js')
    const result = await markMediaHeartbeat({ videoUrl: url, userId })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// [OMEGA-VIDEO ДОП-2] счётчик хранилища клиента — фактом с диска (uploads/<userId>/),
// а не по записям: удаление по TTL/сироты сразу отражается в занятом объёме.
router.get('/storage-usage', protect, async (req, res) => {
  try {
    const userId = (req.user?._id || req.user?.id || '').toString()
    const { readdir, stat } = await import('fs/promises')
    const { join } = await import('path')
    const dir = join(process.cwd(), 'uploads', userId)
    let usedBytes = 0
    let files = 0
    try {
      for (const name of await readdir(dir)) {
        const s = await stat(join(dir, name)).catch(() => null)
        if (s?.isFile()) { usedBytes += s.size; files++ }
      }
    } catch { /* папки нет — занято 0 */ }
    res.json({ success: true, usedBytes, usedMb: Math.round((usedBytes / (1024 * 1024)) * 10) / 10, files })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
