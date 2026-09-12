import axios from 'axios'
import sharp from 'sharp'
import { generateImage } from './aiService.js'

// [OMEGA-VIDEO ДОП-2 З5] Действующие обложки: фон от AI (Pollinations через generateImage),
// текст — детерминированным sharp-оверлеем (НЕ просим AI рисовать текст — он нечитаемый).
// Размер — фактом под платформу. Читаемость гарантируется конструкцией: тёмная плашка под
// текстом, высота текста ≥ COVER_TEXT_MIN_RATIO от меньшей стороны (гейт проверяет факт ratio).

export const COVER_SIZES = {
    youtube: { width: 1280, height: 720 },
    telegram: { width: 1280, height: 720 },
    vk: { width: 1280, height: 720 },
    tiktok: { width: 1080, height: 1920 },
    instagram: { width: 1080, height: 1920 },
    shorts: { width: 1080, height: 1920 },
}
const DEFAULT_SIZE = { width: 1080, height: 1080 }

export const COVER_TEXT_MIN_RATIO = 0.055 // высота строки текста ≥ 5.5% меньшей стороны — читается в мелкой сетке

export function coverSizeForPlatform(platform) {
    return COVER_SIZES[String(platform || '').toLowerCase()] || DEFAULT_SIZE
}

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 2–4 слова → ≤2 строки
function splitLines(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 4)
    if (words.length <= 2) return [words.join(' ')]
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function textOverlaySvg({ width, height, text }) {
    const lines = splitLines(text).filter(Boolean)
    if (!lines.length) return null
    const minSide = Math.min(width, height)
    const fontSize = Math.max(24, Math.round(minSide * Math.max(COVER_TEXT_MIN_RATIO, 0.07)))
    const lineHeight = Math.round(fontSize * 1.25)
    const padX = Math.round(fontSize * 0.9)
    const padY = Math.round(fontSize * 0.55)
    const blockH = lines.length * lineHeight + padY * 2
    const centerY = height - Math.round(height * 0.22) // нижняя треть — классика превью
    const rectY = centerY - Math.round(blockH / 2)
    const textSpans = lines.map((line, i) => {
        const y = rectY + padY + i * lineHeight + Math.round(fontSize * 0.85)
        return `<text x="50%" y="${y}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${escapeXml(line)}</text>`
    }).join('')
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${padX}" y="${rectY}" width="${width - padX * 2}" height="${blockH}" rx="${Math.round(fontSize * 0.4)}" fill="rgba(0,0,0,0.58)"/>
  ${textSpans}
</svg>`
    return { svg: Buffer.from(svg), fontSize, minSide, textHeightRatio: fontSize / minSide, lines: lines.length }
}

async function fetchImageBuffer(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })
    return Buffer.from(res.data)
}

// Детерминированный фолбэк-фон (AI недоступен): градиент + текст — честная локальная обложка, не мок данных
function gradientSvg({ width, height, seed }) {
    const hues = [[262, 316], [199, 262], [316, 20], [160, 199]]
    const [h1, h2] = hues[Math.abs(seed || 0) % hues.length]
    return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${h1},70%,38%)"/><stop offset="1" stop-color="hsl(${h2},75%,22%)"/>
  </linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
</svg>`)
}

/**
 * 3 варианта обложки: { buffer, width, height, seed, provider, textHeightRatio }.
 * topic — тема/ключевой кадр из анализа или сценария; coverText — 2–4 слова на плашке.
 */
export async function generateCoverVariants({ topic, coverText, platform, count = 3, forceFallback = false }) {
    const { width, height } = coverSizeForPlatform(platform)
    const basePrompt = `YouTube video thumbnail background, ${String(topic || 'viral video').slice(0, 300)}, cinematic, high contrast, vivid, no text, no words, no letters`
    const variants = []
    for (let i = 0; i < count; i++) {
        const seed = Math.floor(Math.random() * 1e6)
        let bgBuffer = null
        let provider = 'pollinations'
        if (!forceFallback) {
            try {
                const img = await generateImage(`${basePrompt}, style variation ${i + 1}`, { width, height, seed, nologo: true })
                if (img?.url) bgBuffer = await fetchImageBuffer(img.url)
            } catch (e) {
                console.warn('[coverGenerator] AI background failed, local fallback:', e.message)
            }
        }
        if (!bgBuffer) {
            bgBuffer = gradientSvg({ width, height, seed })
            provider = 'local-fallback'
        }
        const overlay = textOverlaySvg({ width, height, text: coverText || topic })
        let pipeline = sharp(bgBuffer).resize(width, height, { fit: 'cover' })
        if (overlay) pipeline = pipeline.composite([{ input: overlay.svg, top: 0, left: 0 }])
        const buffer = await pipeline.jpeg({ quality: 88 }).toBuffer()
        variants.push({
            buffer,
            width,
            height,
            seed,
            provider,
            textHeightRatio: overlay ? overlay.textHeightRatio : 0,
            textLines: overlay ? overlay.lines : 0,
        })
    }
    return variants
}

export default { generateCoverVariants, coverSizeForPlatform, COVER_SIZES, COVER_TEXT_MIN_RATIO }
