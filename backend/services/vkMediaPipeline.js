import sharp from 'sharp'
import { spawn } from 'child_process'

const VK_LIMITS = {
  photo: { maxWidth: 5000, maxHeight: 3000, maxBytes: 5 * 1024 * 1024 },
  video: { maxBytes: 250 * 1024 * 1024, maxDurationSec: 45 * 60, maxLongEdge: 1920 },
}

async function getFfmpegPaths() {
  try {
    const [ffmpeg, ffprobe] = await Promise.all([
      import('ffmpeg-static').then(m => m.path || m.default).catch(() => null),
      import('ffprobe-static').then(m => m.path || m.default).catch(() => null),
    ])
    return { ffmpegPath: ffmpeg, ffprobePath: ffprobe }
  } catch {
    return { ffmpegPath: null, ffprobePath: null }
  }
}

async function hasFfmpeg() {
  const { ffmpegPath, ffprobePath } = await getFfmpegPaths()
  return !!ffmpegPath && !!ffprobePath
}

function runProcess(cmd, args, inputBuffer, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const stdoutChunks = []
    const stderrChunks = []
    let timer

    child.stdout.on('data', chunk => stdoutChunks.push(chunk))
    child.stderr.on('data', chunk => stderrChunks.push(chunk))

    child.on('error', err => {
      clearTimeout(timer)
      reject(err)
    })

    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8').slice(0, 500)
        reject(new Error(`Process exited ${code}: ${stderr}`))
      } else {
        resolve(Buffer.concat(stdoutChunks))
      }
    })

    timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Process timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    if (inputBuffer) child.stdin.write(inputBuffer)
    child.stdin.end()
  })
}

async function ffprobeJson(buffer) {
  const { ffprobePath } = await getFfmpegPaths()
  if (!ffprobePath) throw new Error('ffprobe-static not available')
  const output = await runProcess(ffprobePath, [
    '-i', 'pipe:0',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-v', 'quiet',
  ], buffer, 30000)
  return JSON.parse(output.toString('utf8'))
}

/**
 * [v9.9.19.15.8] Prepare a photo buffer for VK upload.
 * Output: JPEG, ≤5000×3000, ≤5MB.
 */
export async function preparePhotoBuffer(inputBuffer) {
  const flags = []
  let pipeline = sharp(inputBuffer, { animated: false })

  const metadata = await pipeline.metadata().catch(() => ({}))

  // Flatten transparent PNG/GIF onto white
  if (metadata.hasAlpha) {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } })
    flags.push('flatten_alpha')
  }

  // Resize to fit inside limits
  if (metadata.width > VK_LIMITS.photo.maxWidth || metadata.height > VK_LIMITS.photo.maxHeight) {
    pipeline = pipeline.resize({
      width: VK_LIMITS.photo.maxWidth,
      height: VK_LIMITS.photo.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    flags.push('resized')
  }

  let buffer = await pipeline.jpeg({ quality: 85, progressive: true, force: true }).toBuffer()
  flags.push('jpeg_q85')

  // If still too large, lower quality
  if (buffer.length > VK_LIMITS.photo.maxBytes) {
    buffer = await sharp(buffer).jpeg({ quality: 70, progressive: true }).toBuffer()
    flags.push('jpeg_q70')
  }
  if (buffer.length > VK_LIMITS.photo.maxBytes) {
    buffer = await sharp(buffer).jpeg({ quality: 50, progressive: true }).toBuffer()
    flags.push('jpeg_q50')
  }

  // Last resort: halve dimensions until it fits
  let dims = await sharp(buffer).metadata().catch(() => ({ width: 1, height: 1 }))
  while (buffer.length > VK_LIMITS.photo.maxBytes && dims.width > 100 && dims.height > 100) {
    buffer = await sharp(buffer)
      .resize({ width: Math.floor(dims.width / 2), height: Math.floor(dims.height / 2), fit: 'inside' })
      .jpeg({ quality: 70, progressive: true })
      .toBuffer()
    dims = await sharp(buffer).metadata().catch(() => dims)
    flags.push('halved')
  }

  return { buffer, contentType: 'image/jpeg', ext: '.jpg', flags }
}

/**
 * [v9.9.19.15.8] Prepare a video buffer for VK upload.
 * Output: MP4 H.264 + AAC, faststart, ≤250MB, ≤45min, long edge ≤1920.
 */
export async function prepareVideoBuffer(inputBuffer, filename = 'video.mp4') {
  const { ffmpegPath } = await getFfmpegPaths()
  if (!(await hasFfmpeg())) {
    return { skipped: true, reason: 'ffmpeg_unavailable', flags: ['ffmpeg_unavailable'] }
  }

  if (inputBuffer.length > VK_LIMITS.video.maxBytes) {
    return { skipped: true, reason: 'video_too_large', flags: ['video_too_large'] }
  }

  const flags = []

  try {
    const probe = await ffprobeJson(inputBuffer)
    const duration = parseFloat(probe.format?.duration || 0)
    if (duration > VK_LIMITS.video.maxDurationSec) {
      flags.push('trimmed')
    }

    const videoStream = probe.streams?.find(s => s.codec_type === 'video')
    const audioStream = probe.streams?.find(s => s.codec_type === 'audio')

    const containerMp4 = /mp4/i.test(probe.format?.format_name || '')
    const videoH264 = videoStream?.codec_name === 'h264'
    const audioAac = !audioStream || audioStream?.codec_name === 'aac'
    const needsConversion = !(containerMp4 && videoH264 && audioAac)

    if (!needsConversion) {
      return { buffer: inputBuffer, contentType: 'video/mp4', ext: '.mp4', converted: false, flags }
    }

    const args = [
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', `scale='min(${VK_LIMITS.video.maxLongEdge},iw)':-2`,
      '-t', String(VK_LIMITS.video.maxDurationSec),
      '-f', 'mp4',
      'pipe:1',
    ]

    const buffer = await runProcess(ffmpegPath, args, inputBuffer, 600000)
    flags.push('transcoded_h264_aac')
    return { buffer, contentType: 'video/mp4', ext: '.mp4', converted: true, flags }
  } catch (err) {
    console.warn('[vkMediaPipeline] video conversion failed:', err.message)
    return { skipped: true, reason: 'video_conversion_failed', error: err.message, flags: [...flags, 'conversion_failed'] }
  }
}

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return null
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('data:')) return mediaUrl
  if (mediaUrl.startsWith('/')) {
    const base = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.FRONTEND_URL || ''
    if (base) return `${base.replace(/\/$/, '')}${mediaUrl}`
  }
  return null
}

/**
 * [v9.9.19.15.8] Fetch media from URL with timeout and optional User-Agent.
 * [v9.9.19.15.10] supports relative /uploads/... URLs and logs HTTP status.
 */
export async function fetchMediaBuffer(mediaUrl, timeoutMs = 30000) {
  const rawUrl = resolveMediaUrl(mediaUrl)
  if (!rawUrl) {
    console.warn(`[vk:media] could not resolve media URL: ${String(mediaUrl).slice(0, 80)}`)
    return null
  }
  if (rawUrl.startsWith('data:')) {
    // [v9.9.19.15.12] decode base64 data: URLs coming from composer/old uploads
    const match = rawUrl.match(/^data:([^,;]+)(;base64)?,(.*)$/)
    if (!match) {
      console.warn(`[vk:media] data-url invalid format`)
      return null
    }
    const mime = match[1] || 'application/octet-stream'
    const isBase64 = match[2] === ';base64'
    const data = match[3] || ''
    if (!isBase64) {
      console.warn(`[vk:media] data-url not base64 mime=${mime}`)
      return null
    }
    try {
      const buffer = Buffer.from(data, 'base64')
      console.log(`[vk:media] source=data-url size=${buffer.length} mime=${mime}`)
      return buffer
    } catch (err) {
      console.warn(`[vk:media] data-url decode error: ${err.message}`)
      return null
    }
  }
  const displayUrl = rawUrl.slice(0, 80)
  const source = rawUrl.startsWith('/') ? 'local' : 'http'
  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'AI Viral Studio VK Publisher/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      console.warn(`[vk:media] fetch failed status=${res.status} url=${displayUrl}${rawUrl.length > 80 ? '...' : ''}`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    console.log(`[vk:media] source=${source} size=${buffer.length} url=${displayUrl}${rawUrl.length > 80 ? '...' : ''}`)
    return buffer
  } catch (err) {
    console.warn(`[vk:media] fetch error: ${err.message} url=${displayUrl}${rawUrl.length > 80 ? '...' : ''}`)
    return null
  }
}
