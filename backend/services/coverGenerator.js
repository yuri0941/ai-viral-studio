import axios from 'axios'
import sharp from 'sharp'
import { generateImage } from './aiService.js'
import { extractYouTubeFrames, getLastYtFramesSkip } from './ytFrames.js'
import { titleOverlaySvg, escapeXml } from './coverTypography.js'
import { analyzeFrame } from './frameIntelligence.js'
import { gradeSvg, cinematicGrade, blurFillCompose, buildSticker } from './coverFx.js'
import { getNicheStylePreset } from './nicheStyleService.js'
import { scoreCover } from './coverScore.js'

// [COVERS-FRAMES] Основа обложки — РЕАЛЬНЫЙ кадр: из кадров загруженного видео (те же ≤6,
// что клиент извлекает video+canvas для vision-разбора) или кадры/thumbnail YouTube.
// Text-to-image (Pollinations) НЕ дефолт — только по явному mode:'ai' («Перегенерировать стиль»).
// [COVERS-SUPREME] Пайплайн уровня топов: niche-пресет из реальных топ-обложек ниши (З1),
// выбор момента по эмоции/лицу/действию, не только по контрасту (З2), стикер-объект с обводкой
// и свечением (З3), драматичный фон: цветокор + виньетка + свечение + blur-fill вертикали (З4),
// типографика Russo One: градиент/обводка/свечение/3D, акцентное слово (З5), AI-скор CTR
// каждого варианта, лучший — первым (З6). Текст в image-провайдеры НЕ передаётся никогда.

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

// [COVERS-FRAMES] базовый скор кадра без AI-вызовов: контраст (σ каналов) + детальность (энтропия).
async function scoreFrameBase(buffer) {
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

// [COVERS-SUPREME З2] Выбор момента: эмоция/лицо/действие ВАЖНЕЕ контраста.
// Проход 1 (все кадры): базовый скор + эвристика frameIntelligence (skin-лицо, saliency-герой,
// энергия движения). Проход 2 (топ-4): vision-эмоция (Replicate, если ключ в кабинете) —
// кадр с пиковой эмоцией побеждает кадр с контрастом.
async function scoreFramesSmart(frameBuffers, { withVision = true } = {}) {
    const rows = await Promise.all(frameBuffers.map(async (buffer, index) => {
        const base = await scoreFrameBase(buffer)
        const analysis = await analyzeFrame(buffer, { withVision: false }).catch(() => null)
        return { buffer, index, base, analysis, score: base + (analysis?.bonus || 0) }
    }))
    rows.sort((a, b) => b.score - a.score)
    if (withVision && rows.length > 1) {
        await Promise.all(rows.slice(0, 4).map(async (r) => {
            const v = await analyzeFrame(r.buffer, { withVision: true }).catch(() => null)
            if (v?.vision) {
                r.analysis = v
                r.score = r.base + v.bonus // bonus с vision-эмоцией (×1.4 — эмоция побеждает)
            }
        }))
        rows.sort((a, b) => b.score - a.score)
    }
    return rows
}

// Топ-N кадров по скору (исходные индексы сохраняем — отдаём в frameIndex)
export async function pickBestFrames(frameBuffers, count = 3) {
    const scored = await scoreFramesSmart(frameBuffers, { withVision: false })
    const picked = scored.slice(0, Math.max(1, count))
    while (picked.length < count && scored.length) picked.push(scored[picked.length % scored.length])
    return picked
}

// [COVERS-FRAMES ДОР-2] различимость вариантов при ОДНОМ базовом кадре: разные кропы/зум.
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

// Легаси-оверлей (fontconfig): только если Russo One не загрузился (файл шрифта — в репо, шанс ~0)
function legacyTextSvg({ width, height, text, variant = 0 }) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 4)
    if (!words.length) return null
    const mid = Math.ceil(words.length / 2)
    const lines = words.length <= 2 ? [words.join(' ')] : [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
    const minSide = Math.min(width, height)
    const fontSize = Math.max(24, Math.round(minSide * Math.max(COVER_TEXT_MIN_RATIO, 0.07)))
    const lineHeight = Math.round(fontSize * 1.25)
    const padY = Math.round(fontSize * 0.55)
    const blockH = lines.length * lineHeight + padY * 2
    const isTop = variant === 2
    const rectY = isTop ? Math.round(height * 0.07) : height - blockH - Math.round(fontSize * 0.5)
    const fill = variant === 1 ? '#ffd60a' : '#ffffff'
    const strokeW = Math.max(2, Math.round(fontSize * 0.09))
    const spans = lines.map((line, i) => {
        const y = rectY + padY + i * lineHeight + Math.round(fontSize * 0.85)
        return `<text x="50%" y="${y}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${fill}" paint-order="stroke" stroke="rgba(0,0,0,0.85)" stroke-width="${strokeW}" stroke-linejoin="round">${escapeXml(line)}</text>`
    }).join('')
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${isTop ? 0 : height - blockH - 40}" width="${width}" height="${blockH + 40}" fill="rgba(0,0,0,0.4)"/>${spans}</svg>`
    return { svg: Buffer.from(svg), fontSize, minSide, textHeightRatio: fontSize / minSide, lines: lines.length, blockRatio: blockH / height, bandY: rectY, bandH: blockH }
}

/**
 * [COVERS-SUPREME] Композиция одного варианта: blur-fill при чужом соотношении (З4) →
 * киношный цветокор (З4) → свечение за объектом + виньетка (З4) → стикер-объект с обводкой
 * и свечением (З3) → типографика Russo One (З5). noUpscale — без апскейла выше исходника.
 */
async function composeCover({ bgBuffer, width, height, text, variant, noUpscale = false, preset, analysis }) {
    const scheme = variant % 3
    const cropped = await variantCrop(bgBuffer, variant)
    const vertical = height > width

    // З4: blur-fill — вертикаль из горизонтали: размытая копия кадра в полосы (blur 40, затемнение 0.5)
    const fit = await blurFillCompose(cropped, width, height, { noUpscale })
    const outW = fit.outW, outH = fit.outH

    // З3: стикер героя (лицо стримера / эпичный объект), 30–50% высоты обложки
    let sticker = null
    let stickerPos = null
    const hero = analysis?.heroBox || null
    if (hero) {
        try {
            const cMeta = await sharp(cropped).metadata()
            const cw = cMeta.width || 0, ch = cMeta.height || 0
            // мусорные микро-кластеры (шум) — не герой: минимум 6% кадра по обеим осям
            if (hero.w >= cw * 0.06 && hero.h >= ch * 0.06) {
                const targetH = Math.round(outH * (vertical ? 0.34 : 0.42))
                const st = await buildSticker({ frameBuffer: cropped, heroBox: hero, targetH })
                if (st) {
                    sticker = st
                    const margin = Math.round(outH * 0.03)
                    // вертикаль: объект снизу по центру, текст сверху крупно; горизонталь: справа, текст слева/снизу
                    stickerPos = vertical
                        ? { left: Math.round((outW - st.width) / 2), top: outH - st.height - margin }
                        : { left: outW - st.width - margin, top: scheme === 2 ? outH - st.height - margin : Math.round((outH - st.height) / 2) }
                }
            }
        } catch (e) { console.warn('[coverGenerator] sticker failed:', e.message) }
    }

    // З4: цветокор + виньетка + радиальное свечение за объектом (акцент ниши)
    let base = cinematicGrade(sharp(fit.buffer), { saturation: preset?.gradeSaturation ?? 1.22, contrast: preset?.gradeContrast ?? 1.07 })
    const glow = stickerPos
        ? { x: stickerPos.left + sticker.width / 2, y: stickerPos.top + sticker.height / 2, r: Math.round(Math.max(outW, outH) * 0.55), color: preset?.accentColor || '#ffd60a', opacity: 0.34 }
        : null
    const fx = gradeSvg({ width: outW, height: outH, vignette: preset?.vignette ?? 0.42, glow })
    base = base.composite([{ input: fx, top: 0, left: 0 }])
    if (sticker && stickerPos) {
        base = base.composite(sticker.layers.map(l => ({ input: l.input, left: stickerPos.left, top: stickerPos.top, blend: l.blend || 'over' })))
    }

    // З5: типографика (Russo One, градиент/обводка/свечение/3D, акцентное слово)
    let overlay = await titleOverlaySvg({ width: outW, height: outH, text, scheme, accentColor: preset?.accentColor || '#ffd60a' }).catch(() => null)
    if (overlay?.fallback || !overlay?.svg) overlay = legacyTextSvg({ width: outW, height: outH, text, variant: scheme })

    let pipeline = base
    if (overlay?.svg) pipeline = pipeline.composite([{ input: overlay.svg, top: 0, left: 0 }])
    const buffer = await pipeline.jpeg({ quality: 88 }).toBuffer()

    // З6: AI-скор варианта по CTR-чек-листу (факт по собранному jpeg)
    const stickerArea = sticker && stickerPos ? (sticker.width * sticker.height) / (outW * outH) : 0
    const bandY = overlay ? Math.max(0, (scheme === 2 ? outH * 0.05 : outH - (overlay.blockRatio || 0.32) * outH - outH * 0.07)) : 0
    const scored = await scoreCover(buffer, {
        textHeightRatio: overlay?.textHeightRatio || 0,
        width: outW, height: outH,
        textBand: overlay ? { y: bandY, h: Math.round((overlay.blockRatio || 0.32) * outH), scheme } : null,
        stickerAreaRatio: stickerArea,
        emotion: analysis?.emotion ?? null,
    }).catch(() => ({ score: null, breakdown: null }))

    return {
        buffer, overlay, outWidth: outW, outHeight: outH,
        stickerSource: sticker?.source || null,
        blurFilled: fit.blurred,
        score: scored.score,
        scoreBreakdown: scored.breakdown,
    }
}

// З5: текст НИКОГДА не уходит в image-провайдеры — промпт строится только из темы/сцены
export function buildBackgroundPrompt(topic, sceneDesc = '') {
    const scene = String(sceneDesc || '').replace(/[^\p{L}\p{N}\s,.-]/gu, '').slice(0, 140)
    return `YouTube video thumbnail background, ${String(topic || 'viral video').slice(0, 220)}${scene ? `, scene: ${scene}` : ''}, cinematic, high contrast, vivid, dramatic lighting, no text, no words, no letters`
}

// PRO (З4): img2img-стилизация фона через Replicate SDXL (ключ в кабинете). Текст — НИКОГДА.
async function stylizeBackgroundPro(buffer, prompt) {
    try {
        const { getProviderKey } = await import('./aiService.js')
        const key = await getProviderKey('replicate')
        if (!key) return null
        const small = await sharp(buffer).resize(1024, 576, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
        const res = await axios.post('https://api.replicate.com/v1/models/stability-ai/sdxl/predictions', {
            input: { image: `data:image/jpeg;base64,${small.toString('base64')}`, prompt, prompt_strength: 0.55, num_outputs: 1 },
        }, { headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json', Prefer: 'wait=55' }, timeout: 70000 })
        const url = Array.isArray(res.data?.output) ? res.data.output[0] : null
        if (!url) return null
        return await fetchImageBuffer(url)
    } catch (e) {
        console.warn('[coverGenerator] img2img pro failed:', e.message)
        return null
    }
}

function variantOut({ composed, extra }) {
    const { buffer, overlay, outWidth, outHeight, stickerSource, blurFilled, score, scoreBreakdown } = composed
    return {
        buffer,
        width: outWidth,
        height: outHeight,
        textHeightRatio: overlay ? overlay.textHeightRatio : 0,
        textLines: overlay ? overlay.lines : 0,
        textBlockRatio: overlay?.blockRatio ?? null,
        sticker: stickerSource,          // 'pro' | 'organic' | null
        blurFilled,
        score,
        scoreBreakdown,
        ...extra,
    }
}

/**
 * 3 варианта обложки (отсортированы AI-скором З6 — лучший первый, best:true у топа):
 * { buffer, width, height, seed, provider, source, textHeightRatio, score, scoreBreakdown, best }.
 * mode: 'frame' (дефолт — реальный кадр видео/YouTube) | 'ai' (Pollinations text-to-image).
 * [COVERS-SUPREME З1] preset — niche-пресет из реальных топ-обложек (nicheStyleService);
 * [З2] кадр выбирается по эмоции/лицу/действию (frameIntelligence, vision при наличии ключа).
 */
export async function generateCoverVariants({ topic, coverText, platform, count = 3, forceFallback = false, frames = [], fullFrames = [], sourceUrl = '', mode = 'frame', ytFramesProvider = null, niche = '', ownerId = null }) {
    const { width, height } = coverSizeForPlatform(platform)
    const text = coverText || topic
    // З1: пресет стиля ниши из РЕАЛЬНЫХ топ-обложек; нет данных → универсальный вирусный
    const preset = await getNicheStylePreset({ topic, niche, ownerId }).catch(() => null)

    const finish = (variants) => {
        // З6: лучший первый — по AI-скору; при равенстве/отсутствии скора — порядок выбора момента
        const scored = variants.map((v, i) => ({ v, i }))
        scored.sort((a, b) => (b.v.score ?? -1) - (a.v.score ?? -1) || a.i - b.i)
        return scored.map((s, rank) => ({ ...s.v, best: rank === 0 }))
    }

    // [COVERS-FRAMES] дефолт: реальный кадр. Лучшие моменты × композиции.
    if (mode !== 'ai') {
        const frameBuffers = (Array.isArray(frames) ? frames : []).map(frameDataUrlToBuffer).filter(Boolean).slice(0, 6)
        const fullBuffers = (Array.isArray(fullFrames) ? fullFrames : []).map(frameDataUrlToBuffer)
        if (frameBuffers.length) {
            const scored = await scoreFramesSmart(frameBuffers, { withVision: true })
            const picked = scored.slice(0, Math.max(1, count))
            while (picked.length < count && scored.length) picked.push(scored[picked.length % scored.length])
            const variants = []
            for (let i = 0; i < picked.length; i++) {
                const fullBuf = fullBuffers[picked[i].index] || null
                const bgBuffer = fullBuf || picked[i].buffer
                const composed = await composeCover({
                    bgBuffer, width, height, text, variant: i % 3, noUpscale: !!fullBuf,
                    preset, analysis: picked[i].analysis,
                })
                variants.push(variantOut({
                    composed,
                    extra: {
                        seed: picked[i].index,
                        provider: 'video-frame',
                        source: 'frame',
                        frameIndex: picked[i].index,
                        bgFullRes: !!fullBuf,
                        moment: { emotion: picked[i].analysis?.emotion ?? null, action: picked[i].analysis?.action ?? null, hero: picked[i].analysis?.heroBox?.kind || null },
                    },
                }))
            }
            if (variants.length) return finish(variants)
        }
        const ytId = extractYouTubeId(sourceUrl)
        if (ytId) {
            // [YT-FRAMES] сначала кадры САМОГО видео (yt-dlp ≤720p → ffmpeg → скор → 3 кадра);
            // любой сбой → null → прежний thumbnail-фолбэк. ytFramesProvider — тестовый шов.
            const framesRes = ytFramesProvider
                ? await ytFramesProvider(ytId).catch(() => null)
                : await extractYouTubeFrames(ytId).catch(() => null)
            if (framesRes?.frames?.length) {
                const scored = await scoreFramesSmart(framesRes.frames, { withVision: true })
                const picked = scored.slice(0, Math.max(1, count))
                while (picked.length < count && scored.length) picked.push(scored[picked.length % scored.length])
                const variants = []
                for (let i = 0; i < picked.length; i++) {
                    const composed = await composeCover({
                        bgBuffer: picked[i].buffer, width, height, text, variant: i % 3, noUpscale: (i % 3) === 0,
                        preset, analysis: picked[i].analysis,
                    })
                    variants.push(variantOut({
                        composed,
                        extra: {
                            seed: picked[i].index,
                            provider: 'youtube-frames',
                            source: 'youtube-frames',
                            frameIndex: picked[i].index,
                            bgFullRes: true,
                            moment: { emotion: picked[i].analysis?.emotion ?? null, action: picked[i].analysis?.action ?? null, hero: picked[i].analysis?.heroBox?.kind || null },
                        },
                    }))
                }
                if (variants.length) return finish(variants)
            } else if (!ytFramesProvider) {
                console.warn(`[coverGenerator] yt-frames недоступны для ${ytId}: ${getLastYtFramesSkip() || 'unknown'} — пробую официальный thumbnail`)
            }
            const thumb = await fetchYouTubeThumbnail(ytId).catch(() => null)
            if (thumb?.buffer) {
                // [COVERS-SUPREME З4] thumbnail-фолбэк (anti-bot/free tier) — тот же эталонный пайплайн
                const analysis = await analyzeFrame(thumb.buffer, { withVision: true }).catch(() => null)
                const variants = []
                for (let i = 0; i < count; i++) {
                    const composed = await composeCover({ bgBuffer: thumb.buffer, width, height, text, variant: i % 3, preset, analysis })
                    variants.push(variantOut({
                        composed,
                        extra: { seed: i, provider: 'youtube-thumbnail', source: 'youtube', thumbQuality: thumb.quality },
                    }))
                }
                if (variants.length) return finish(variants)
            } else {
                console.warn(`[coverGenerator] thumbnail недоступен для ${ytId} — AI-фолбэк (Pollinations)`)
            }
        }
    }

    // AI-фон (Pollinations): mode:'ai' («Перегенерировать стиль») или фолбэк, когда кадров нет.
    // Текст обложки в промпт НЕ передаётся никогда (З5 — текст только sharp-оверлей).
    const basePrompt = buildBackgroundPrompt(topic)
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
        const composed = await composeCover({ bgBuffer, width, height, text, variant: i % 3, preset, analysis: null })
        variants.push(variantOut({
            composed,
            extra: { seed, provider, source: 'ai' },
        }))
    }
    return finish(variants)
}

export default { generateCoverVariants, coverSizeForPlatform, COVER_SIZES, COVER_TEXT_MIN_RATIO, extractYouTubeId, fetchYouTubeThumbnail, pickBestFrames, buildBackgroundPrompt }
