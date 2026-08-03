import sharp from 'sharp'
import axios from 'axios'
import { generateImage } from './aiService.js'

const DEFAULT_TEXT = 'Сделано в OMEGA'

function normalizePosition(position) {
    const valid = ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center']
    return valid.includes(position) ? position : 'bottom-right'
}

export async function generateWatermarkImage(logoUrl, opacity = 0.3) {
    try {
        if (logoUrl) {
            const { data } = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 10000 })
            const buffer = Buffer.from(data)
            const meta = await sharp(buffer).metadata()
            const width = Math.min(meta.width || 200, 200)
            const resized = await sharp(buffer)
                .resize(width, null, { withoutEnlargement: true })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true })
            return {
                buffer: resized.data,
                info: resized.info,
                source: 'logo',
            }
        }
    } catch (err) {
        console.warn('[watermark] logo processing failed:', err.message)
    }

    // [P20] added: text-based fallback watermark
    const svg = `
        <svg width="320" height="60" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                font-family="Arial, sans-serif" font-size="28" font-weight="bold"
                fill="white" opacity="${Math.max(0.1, Math.min(1, opacity))}">
                ${DEFAULT_TEXT}
            </text>
        </svg>`
    const buffer = Buffer.from(svg)
    return { buffer, info: { width: 320, height: 60, channels: 4 }, source: 'text' }
}

export async function applyWatermarkToImage(imageUrl, settings = {}) {
    const {
        position = 'bottom-right',
        opacity = 0.3,
        size = 0.15,
        logoUrl = null,
        text = DEFAULT_TEXT,
    } = settings

    try {
        const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 })
        const imageBuffer = Buffer.from(data)
        const imageMeta = await sharp(imageBuffer).metadata()

        const wm = await generateWatermarkImage(logoUrl, opacity)
        const wmWidth = Math.max(80, Math.round((imageMeta.width || 1200) * size))
        const wmHeight = Math.round((wm.info.height / wm.info.width) * wmWidth)

        let overlayBuffer
        if (wm.source === 'logo') {
            overlayBuffer = await sharp(wm.buffer, {
                raw: { width: wm.info.width, height: wm.info.height, channels: wm.info.channels }
            })
                .resize(wmWidth, wmHeight, { fit: 'inside' })
                .ensureAlpha()
                .toBuffer()
        } else {
            overlayBuffer = wm.buffer
        }

        const gravity = {
            'bottom-right': 'southeast',
            'bottom-left': 'southwest',
            'top-right': 'northeast',
            'top-left': 'northwest',
            'center': 'centre',
        }[normalizePosition(position)] || 'southeast'

        const watermarked = await sharp(imageBuffer)
            .composite([
                { input: overlayBuffer, gravity, blend: 'over' }
            ])
            .jpeg({ quality: 90 })
            .toBuffer()

        const base64 = watermarked.toString('base64')
        return {
            success: true,
            url: `data:image/jpeg;base64,${base64}`,
            position: normalizePosition(position),
            opacity,
            size,
        }
    } catch (err) {
        console.error('[watermark] apply failed:', err.message)
        return {
            success: false,
            error: err.message,
            // [P20] added: placeholder image URL fallback
            url: `https://image.pollinations.ai/prompt/${encodeURIComponent(text + ' watermark overlay')}?width=1024&height=1024&nologo=true`,
        }
    }
}

export function canDisableWatermark(user) {
    if (!user) return false
    if (user.role === 'owner') return true
    const allowedSubscriptions = ['pro', 'enterprise']
    return allowedSubscriptions.includes(user.subscription)
}

export default {
    generateWatermarkImage,
    applyWatermarkToImage,
    canDisableWatermark,
}
