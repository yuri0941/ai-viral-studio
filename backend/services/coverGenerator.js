import axios from 'axios'
import sharp from 'sharp'
import { generateImage } from './aiService.js'

// [COVERS-FRAMES] Основа обложки — РЕАЛЬНЫЙ кадр: из кадров загруженного видео (те же ≤6,
// что клиент извлекает video+canvas для vision-разбора) или официальный thumbnail YouTube
// (maxresdefault → sddefault → hqdefault по факту доступности). Text-to-image (Pollinations)
// НЕ дефолт — только по явному mode:'ai' (кнопка «Перегенерировать стиль»).
// Текст — детерминированным sharp-оверлеем (AI текст НЕ рисует): скрим-градиент под текстом,
// обводка/тень для контраста, тёмная плашка в композиции 0. Читаемость — гейт
// textHeightRatio ≥ COVER_TEXT_MIN_RATIO (превью-сетка 320px → ≥10px рендера).

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

// 3 композиции текста: 0 — низ по центру с плашкой; 1 — низ слева на скриме; 2 — верх слева на скриме.
// Контраст везде: скрим-градиент + обводка текста (paint-order stroke) + плашка в композиции 0.
function textOverlaySvg({ width, height, text, variant = 0 }) {
    const lines = splitLines(text).filter(Boolean)
    if (!lines.length) return null
    const minSide = Math.min(width, height)
    const fontSize = Math.max(24, Math.round(minSide * Math.max(COVER_TEXT_MIN_RATIO, 0.07)))
    const lineHeight = Math.round(fontSize * 1.25)
    const padX = Math.round(fontSize * 0.9)
    const padY = Math.round(fontSize * 0.55)
    const blockH = lines.length * lineHeight + padY * 2
    const layout = variant === 2 ? 'top-left' : variant === 1 ? 'bottom-left' : 'bottom-center'
    // [COVERS-FRAMES ДОР-2] различимость вариантов: разные цветовые схемы текста и сила скрима
    const scheme = variant === 1
        ? { fill: '#ffd60a', scrim: 0.84 } // акцентный жёлтый + сильный скрим
        : variant === 2
            ? { fill: '#ffffff', scrim: 0.56 } // лёгкий скрим сверху
            : { fill: '#ffffff', scrim: 0.72 } // базовая схема
    const isTop = layout === 'top-left'
    const alignLeft = layout !== 'bottom-center'
    const rectY = isTop
        ? Math.round(height * 0.07)
        : Math.min(height - blockH - Math.round(fontSize * 0.5), height - Math.round(height * 0.22) - Math.round(blockH / 2))
    const scrimH = Math.min(height, Math.round(blockH + height * 0.16))
    const scrimY = isTop ? 0 : height - scrimH
    const gradId = `scrim${variant}`
    const grad = `<linearGradient id="${gradId}" x1="0" y1="${isTop ? 0 : 1}" x2="0" y2="${isTop ? 1 : 0}">
    <stop offset="0" stop-color="rgba(0,0,0,${scheme.scrim})"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>`
    const plaque = layout === 'bottom-center'
        ? `<rect x="${padX}" y="${rectY}" width="${width - padX * 2}" height="${blockH}" rx="${Math.round(fontSize * 0.4)}" fill="rgba(0,0,0,0.58)"/>`
        : ''
    const strokeW = Math.max(2, Math.round(fontSize * 0.09))
    const xPos = alignLeft ? Math.round(padX * 1.4) : '50%'
    const anchor = alignLeft ? 'start' : 'middle'
    const textSpans = lines.map((line, i) => {
        const y = rectY + padY + i * lineHeight + Math.round(fontSize * 0.85)
        return `<text x="${xPos}" y="${y}" text-anchor="${anchor}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${scheme.fill}" paint-order="stroke" stroke="rgba(0,0,0,0.85)" stroke-width="${strokeW}" stroke-linejoin="round">${escapeXml(line)}</text>`
    }).join('')
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${grad}</defs>
  <rect x="0" y="${scrimY}" width="${width}" height="${scrimH}" fill="url(#${gradId})"/>
  ${plaque}
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

// [COVERS-FRAMES] YouTube videoId из любой формы ссылки (watch/shorts/youtu.be/embed)
export function extractYouTubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?[^\s]*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
}

const YT_THUMB_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault']

// Официальный thumbnail максимального качества ПО ФАКТУ: 404 / заглушка 120×90 / мелкий кадр → следующее качество
export async function fetchYouTubeThumbnail(videoId) {
    for (const quality of YT_THUMB_QUALITIES) {
        try {
            const res = await axios.get(`https://i.ytimg.com/vi/${videoId}/${quality}.jpg`, {
                responseType: 'arraybuffer',
                timeout: 15000,
                validateStatus: () => true,
            })
            if (res.status !== 200) continue
            const buf = Buffer.from(res.data)
            if (buf.length < 6000) continue // заглушка «кадра нет»
            const meta = await sharp(buf).metadata()
            if ((meta.width || 0) < 320) continue
            return { buffer: buf, quality, width: meta.width, height: meta.height }
        } catch { /* следующее качество */ }
    }
    return null
}

// dataURL (jpeg/png от client canvas) → Buffer; чужие форматы отбрасываем
function frameDataUrlToBuffer(dataUrl) {
    const m = /^data:image\/(jpeg|jpg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(String(dataUrl || ''))
    if (!m) return null
    try {
        const buf = Buffer.from(m[2], 'base64')
        return buf.length > 500 ? buf : null
    } catch { return null }
}

// [COVERS-FRAMES] скор кадра без AI-вызовов: контраст (σ каналов) + детальность (энтропия).
// Резкость приближает энтропия jpeg от canvas; лица/действие бустит контраст центральной зоны.
async function scoreFrame(buffer) {
    try {
        const img = sharp(buffer)
        const stats = await img.stats()
        const meta = await sharp(buffer).metadata()
        const w = meta.width || 0
        const h = meta.height || 0
        const contrast = stats.channels?.length
            ? stats.channels.slice(0, 3).reduce((s, c) => s + (c.stdev || 0), 0) / Math.min(3, stats.channels.length)
            : 0
        let centerBoost = 0
        if (w >= 64 && h >= 64) {
            const cw = Math.round(w / 2)
            const ch = Math.round(h / 2)
            const cStats = await sharp(buffer).extract({ left: Math.round((w - cw) / 2), top: Math.round((h - ch) / 2), width: cw, height: ch }).stats()
            const cContrast = cStats.channels?.length
                ? cStats.channels.slice(0, 3).reduce((s, c) => s + (c.stdev || 0), 0) / Math.min(3, cStats.channels.length)
                : 0
            centerBoost = Math.max(0, cContrast - contrast) * 0.5
        }
        return (stats.entropy || 0) + contrast / 64 + centerBoost / 64
    } catch { return 0 }
}

// Топ-N кадров по скору (исходные индексы сохраняем — отдаём в frameIndex)
export async function pickBestFrames(frameBuffers, count = 3) {
    const scored = await Promise.all(frameBuffers.map(async (buffer, index) => ({ buffer, index, score: await scoreFrame(buffer) })))
    scored.sort((a, b) => b.score - a.score)
    const picked = scored.slice(0, Math.max(1, count))
    // кадров меньше, чем вариантов — дозаполняем лучшими (композиция текста всё равно разная)
    while (picked.length < count && scored.length) picked.push(scored[picked.length % scored.length])
    return picked
}

// [COVERS-FRAMES ДОР-2] различимость вариантов при ОДНОМ базовом кадре (YouTube-thumbnail,
// повтор кадра при нехватке): разные кропы/зум. Вариант 0 — кадр целиком; 1 — зум к центру
// с уклоном вверх (лицо крупнее); 2 — смещение вправо-вниз (текст вверху слева, зона свободна).
async function variantCrop(buffer, variant) {
    if (!variant) return buffer
    try {
        const meta = await sharp(buffer).metadata()
        const w = meta.width || 0
        const h = meta.height || 0
        if (w < 128 || h < 128) return buffer
        if (variant === 1) {
            const cw = Math.round(w * 0.7)
            const ch = Math.round(h * 0.7)
            return await sharp(buffer).extract({ left: Math.round((w - cw) / 2), top: Math.round((h - ch) * 0.35), width: cw, height: ch }).toBuffer()
        }
        const cw = Math.round(w * 0.78)
        const ch = Math.round(h * 0.78)
        return await sharp(buffer).extract({ left: w - cw, top: h - ch, width: cw, height: ch }).toBuffer()
    } catch { return buffer }
}

// [COVERS-FRAMES ДОР] noUpscale: рендер из полноразмерного кадра — без апскейла выше исходника
// (720p → 1280×720 нативно; исходник мельче цели — кроп без увеличения, оверлей строится
// по ФАКТИЧЕСКИМ размерам результата, иначе composite 1280×720 на 960×540 падает).
async function composeCover({ bgBuffer, width, height, text, variant, noUpscale = false }) {
    const cropped = await variantCrop(bgBuffer, variant)
    let base = sharp(cropped).resize(width, height, { fit: 'cover', withoutEnlargement: noUpscale })
    let outW = width
    let outH = height
    if (noUpscale) {
        const resized = await base.toBuffer()
        try {
            const meta = await sharp(resized).metadata()
            outW = meta.width || width
            outH = meta.height || height
        } catch { /* остаются целевые */ }
        base = sharp(resized)
    }
    const overlay = textOverlaySvg({ width: outW, height: outH, text, variant })
    let pipeline = base
    if (overlay) pipeline = pipeline.composite([{ input: overlay.svg, top: 0, left: 0 }])
    const buffer = await pipeline.jpeg({ quality: 88 }).toBuffer()
    return { buffer, overlay, outWidth: outW, outHeight: outH }
}

/**
 * 3 варианта обложки: { buffer, width, height, seed, provider, source, textHeightRatio }.
 * mode: 'frame' (дефолт — реальный кадр видео/YouTube) | 'ai' (Pollinations text-to-image).
 * frames — dataURL'ы кадров загруженного видео (640px, client canvas, для скора).
 * [COVERS-FRAMES ДОР] fullFrames — те же таймкоды в исходном разрешении (до 1920×1080):
 * скор-выбор идёт по 640px (быстро), финальный рендер — из полноразмерного кадра того же
 * индекса, БЕЗ апскейла выше исходника. Нет fullFrames — легаси-поведение (рендер из frames).
 * sourceUrl — ссылка на YouTube (thumbnail по факту доступности). Нет кадров/ссылки — фолбэк на AI.
 */
export async function generateCoverVariants({ topic, coverText, platform, count = 3, forceFallback = false, frames = [], fullFrames = [], sourceUrl = '', mode = 'frame' }) {
    const { width, height } = coverSizeForPlatform(platform)
    const text = coverText || topic

    // [COVERS-FRAMES] дефолт: реальный кадр. 3 разных кадра × 3 композиции текста.
    if (mode !== 'ai') {
        const frameBuffers = (Array.isArray(frames) ? frames : []).map(frameDataUrlToBuffer).filter(Boolean).slice(0, 6)
        // полноразмерные кадры — строго по тем же индексам, что и 640px (клиент шлёт параллельные массивы)
        const fullBuffers = (Array.isArray(fullFrames) ? fullFrames : []).map(frameDataUrlToBuffer)
        if (frameBuffers.length) {
            const picked = await pickBestFrames(frameBuffers, count)
            const variants = []
            for (let i = 0; i < picked.length; i++) {
                const fullBuf = fullBuffers[picked[i].index] || null
                const bgBuffer = fullBuf || picked[i].buffer
                const { buffer, overlay, outWidth, outHeight } = await composeCover({
                    bgBuffer, width, height, text, variant: i % 3, noUpscale: !!fullBuf,
                })
                variants.push({
                    buffer,
                    width: outWidth,
                    height: outHeight,
                    seed: picked[i].index,
                    provider: 'video-frame',
                    source: 'frame',
                    frameIndex: picked[i].index,
                    bgFullRes: !!fullBuf, // факт: фон собран из полноразмерного кадра
                    textHeightRatio: overlay ? overlay.textHeightRatio : 0,
                    textLines: overlay ? overlay.lines : 0,
                })
            }
            if (variants.length) return variants
        }
        const ytId = extractYouTubeId(sourceUrl)
        if (ytId) {
            const thumb = await fetchYouTubeThumbnail(ytId).catch(() => null)
            if (thumb?.buffer) {
                const variants = []
                for (let i = 0; i < count; i++) {
                    const { buffer, overlay } = await composeCover({ bgBuffer: thumb.buffer, width, height, text, variant: i % 3 })
                    variants.push({
                        buffer, width, height,
                        seed: i,
                        provider: 'youtube-thumbnail',
                        source: 'youtube',
                        thumbQuality: thumb.quality,
                        textHeightRatio: overlay ? overlay.textHeightRatio : 0,
                        textLines: overlay ? overlay.lines : 0,
                    })
                }
                if (variants.length) return variants
            }
        }
    }

    // AI-фон (Pollinations): mode:'ai' («Перегенерировать стиль») или фолбэк, когда кадров нет
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
        const { buffer, overlay } = await composeCover({ bgBuffer, width, height, text, variant: i % 3 })
        variants.push({
            buffer,
            width,
            height,
            seed,
            provider,
            source: 'ai',
            textHeightRatio: overlay ? overlay.textHeightRatio : 0,
            textLines: overlay ? overlay.lines : 0,
        })
    }
    return variants
}

export default { generateCoverVariants, coverSizeForPlatform, COVER_SIZES, COVER_TEXT_MIN_RATIO, extractYouTubeId, fetchYouTubeThumbnail, pickBestFrames }
