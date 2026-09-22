// [COVERS-SUPREME З3/З4] Сцена обложки уровня топов: драматичный фон + стикер-объект.
// Фон (всегда, без ключей): киношный цветокор (контраст+/насыщенность+), виньетка,
// радиальное свечение за объектом (акцент ниши), затемнение под текстом — scrim у типографики.
// Blur-fill: вертикаль из горизонтали (и наоборот) — полосы = размытая копия кадра
// (blur 40, затемнение 0.5), резкий кадр поверх по центру (fit contain) — предмет не режется.
// Стикер: герой кадра (лицо стримера / эпичный объект) крупно 30–50% высоты + толстая светлая
// обводка + внешнее свечение. PRO: ключ remove.bg (или Replicate rembg) в кабинете → полноценный
// cutout без фона; без ключа — органичная маска (перо-эллипс по bbox) + обводка скрывает края.
import sharp from 'sharp'
import axios from 'axios'
import { TtlLruCache } from '../utils/ttlLruCache.js'
import { logMemory } from '../utils/memoryLog.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ── З4: киношный цветокор + виньетка + свечение за объектом ──
export function gradeSvg({ width, height, vignette = 0.42, glow = null, scrim = 0.0, scrimTop = false }) {
    const parts = []
    // радиальное свечение за объектом (акцентный цвет ниши)
    if (glow) {
        parts.push(`<radialGradient id="glowG" cx="${glow.x}" cy="${glow.y}" r="${glow.r}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${glow.color}" stop-opacity="${glow.opacity ?? 0.4}"/>
      <stop offset="1" stop-color="${glow.color}" stop-opacity="0"/>
    </radialGradient>`)
    }
    parts.push(`<radialGradient id="vigG" cx="0.5" cy="0.46" r="0.85">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="${vignette}"/>
    </radialGradient>`)
    if (scrim > 0) {
        parts.push(`<linearGradient id="scrimG" x1="0" y1="${scrimTop ? 0 : 1}" x2="0" y2="${scrimTop ? 1 : 0}">
      <stop offset="0" stop-color="#000" stop-opacity="${scrim}"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>`)
    }
    return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${parts.join('')}</defs>
  ${glow ? `<rect width="${width}" height="${height}" fill="url(#glowG)"/>` : ''}
  <rect width="${width}" height="${height}" fill="url(#vigG)"/>
  ${scrim > 0 ? `<rect width="${width}" height="${Math.round(height * 0.42)}" y="${scrimTop ? 0 : height - Math.round(height * 0.42)}" fill="url(#scrimG)"/>` : ''}
</svg>`)
}

// Цветокор: контраст+/насыщенность+ (мягко, чтобы маркеры гейтов не инвертировались)
export function cinematicGrade(img, { saturation = 1.22, contrast = 1.07, brightness = 1.02 } = {}) {
    return img.modulate({ saturation, brightness }).linear(contrast, -(128 * (contrast - 1)))
}

// ── З4: blur-fill — полосы под чужое соотношение сторон ──
// Возвращает { base: sharp, outW, outH, blurred: bool }
export async function blurFillCompose(buffer, outW, outH, { noUpscale = false } = {}) {
    const meta = await sharp(buffer).metadata()
    const srcW = meta.width || outW, srcH = meta.height || outH
    const srcAspect = srcW / srcH, dstAspect = outW / outH
    const mismatch = Math.abs(Math.log(srcAspect / dstAspect))
    if (mismatch < 0.16) { // почти то же соотношение — обычный cover
        let img = sharp(buffer).resize(outW, outH, { fit: 'cover', withoutEnlargement: noUpscale })
        const buf = await img.toBuffer()
        const m2 = await sharp(buf).metadata()
        return { buffer: buf, outW: m2.width || outW, outH: m2.height || outH, blurred: false }
    }
    const fill = await sharp(buffer).resize(outW, outH, { fit: 'cover' }).blur(40).modulate({ brightness: 0.5 }).toBuffer()
    const fg = await sharp(buffer).resize(outW, outH, { fit: 'inside', withoutEnlargement: noUpscale }).toBuffer()
    const fgMeta = await sharp(fg).metadata()
    const fw = fgMeta.width || outW, fh = fgMeta.height || outH
    const left = Math.round((outW - fw) / 2)
    const top = Math.round((outH - fh) / 2)
    const out = await sharp(fill).composite([{ input: fg, left, top }]).toBuffer()
    const m2 = await sharp(out).metadata()
    return { buffer: out, outW: m2.width || outW, outH: m2.height || outH, blurred: true }
}

// ── З3: стикер ──
// PRO cutout: remove.bg API (ключ 'removebg' в кабинете) → PNG с альфой. Сбой/нет ключа → null.
const cutoutCache = new TtlLruCache({ ttlMs: 30 * 60 * 1000, maxEntries: 24 })
export async function proCutout(frameBuffer) {
    const { getProviderKey } = await import('./aiService.js')
    const cacheKey = `cut:${frameBuffer.length}:${frameBuffer.readUInt32LE(64) || 0}`
    const cached = cutoutCache.get(cacheKey)
    if (cached) return cached
    const removebgKey = await getProviderKey('removebg')
    if (removebgKey) {
        try {
            logMemory('cover:removebg')
            const res = await axios.post('https://api.remove.bg/v1.0/removebg',
                (() => { const fd = new FormData(); fd.append('image_file', new Blob([frameBuffer], { type: 'image/jpeg' }), 'frame.jpg'); fd.append('size', 'auto'); return fd })(),
                { headers: { 'X-Api-Key': removebgKey }, responseType: 'arraybuffer', timeout: 60000 })
            const png = Buffer.from(res.data)
            if (png.length > 1000 && png[0] === 0x89) { cutoutCache.set(cacheKey, png); return png }
        } catch (e) {
            if ([401, 402, 403].includes(e.response?.status)) {
                const { disableProviderKey } = await import('../utils/providerKeyGuard.js')
                await disableProviderKey('removebg', `HTTP ${e.response.status}`).catch(() => {})
            }
            console.warn('[coverFx] remove.bg failed:', e.message)
        }
    }
    // фолбэк: Replicate rembg (тот же контур ключа, что и vision)
    const repKey = await getProviderKey('replicate')
    if (repKey) {
        try {
            const small = await sharp(frameBuffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
            const res = await axios.post('https://api.replicate.com/v1/models/cjwbw/rembg/predictions',
                { input: { image: `data:image/jpeg;base64,${small.toString('base64')}` } },
                { headers: { Authorization: `Token ${repKey}`, 'Content-Type': 'application/json', Prefer: 'wait=55' }, timeout: 70000 })
            const url = res.data?.output
            if (typeof url === 'string' && url.startsWith('http')) {
                const img = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
                const png = Buffer.from(img.data)
                if (png.length > 1000) { cutoutCache.set(cacheKey, png); return png }
            }
        } catch (e) {
            if ([401, 403].includes(e.response?.status)) {
                const { disableProviderKey } = await import('../utils/providerKeyGuard.js')
                await disableProviderKey('replicate', `HTTP ${e.response.status}`).catch(() => {})
            }
            console.warn('[coverFx] replicate rembg failed:', e.message)
        }
    }
    return null
}

// Органичная маска по bbox (перо-эллипс): вырез героя без ключа — обводка скрывает края.
// Паддинг маленький (6%): маска обнимает объект, иначе на светлом фоне виден тёмный диск.
async function organicCutout(frameBuffer, box, padding = 0.06) {
    const meta = await sharp(frameBuffer).metadata()
    const W = meta.width || 0, H = meta.height || 0
    const padX = box.w * padding, padY = box.h * padding
    const x = clamp(box.x - padX, 0, W), y = clamp(box.y - padY, 0, H)
    const w = clamp(box.w + padX * 2, 8, W - x), h = clamp(box.h + padY * 2, 8, H - y)
    // эллипс УЖЕ bbox (84%): saliency-бокс всегда с воздухом — иначе маска = скруглённый
    // прямоугольник с тёмным кольцом фона вместо чистого объекта
    const rx = (w / 2) * 0.84, ry = (h / 2) * 0.84, cx = x + w / 2, cy = y + h / 2
    const maskSvg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>
</svg>`)
    const mask = await sharp(maskSvg).png().blur(3).toBuffer()
    const region = await sharp(frameBuffer).extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) }).png().toBuffer()
    const regionMask = await sharp(mask).extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) }).extractChannel(0).toBuffer()
    const cut = await sharp(region).joinChannel(regionMask).png().toBuffer()
    return { png: cut, width: Math.round(w), height: Math.round(h) }
}

// Обводка+свечение: раздутая альфа стикера → светлая плашка под ним + мягкое свечение
async function stickerLayers(pngBuffer) {
    const alpha = await sharp(pngBuffer).extractChannel('alpha').toBuffer()
    const meta = await sharp(pngBuffer).metadata()
    const w = meta.width, h = meta.height
    const mkTint = async (alphaBuf, color, alphaScale = 1) => {
        const a = alphaScale < 1 ? await sharp(alphaBuf).linear(alphaScale, 0).toBuffer() : alphaBuf
        const solid = await sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer()
        return sharp(solid).joinChannel(a).png().toBuffer()
    }
    // обводка: альфа, раздутая blur+threshold → белая плашка под стикером (виден только контур).
    // Толщина — от высоты стикера (топы: ~4–6% высоты объекта), иначе на 300px тонкая нить.
    const outR = Math.max(8, Math.round(h * 0.045))
    const outlineA = await sharp(alpha).blur(outR).threshold(110).toBuffer()
    const glowA = await sharp(alpha).blur(Math.max(18, Math.round(h * 0.08))).toBuffer()
    const outlineImg = await mkTint(outlineA, { r: 255, g: 255, b: 255 })
    const glowImg = await mkTint(glowA, { r: 255, g: 244, b: 214 }, 0.6)
    return { outlineImg, glowImg, w, h }
}

/**
 * Собрать стикер-слой для композита: вход — исходный кадр + heroBox (координаты исходника),
 * выход — { composites: [{input,left,top}...], width, height, source: 'pro'|'organic' } | null.
 * targetH — целевая высота стикера на обложке (30–50% высоты кадра обложки).
 */
export async function buildSticker({ frameBuffer, heroBox, targetH, outlineColor = 'light' }) {
    if (!heroBox || heroBox.w < 24 || heroBox.h < 24) return null
    let png = null
    let source = 'organic'
    let cutW = 0, cutH = 0
    const pro = await proCutout(frameBuffer).catch(() => null)
    if (pro) {
        png = pro
        const m = await sharp(pro).metadata()
        cutW = m.width; cutH = m.height
        source = 'pro'
    } else {
        const org = await organicCutout(frameBuffer, heroBox).catch(() => null)
        if (!org) return null
        png = org.png; cutW = org.width; cutH = org.height
    }
    const scale = targetH / cutH
    const w = Math.round(cutW * scale), h = targetH
    if (w < 20 || h < 20) return null
    const sticker = await sharp(png).resize(w, h, { fit: 'fill' }).png().toBuffer()
    const { outlineImg, glowImg } = await stickerLayers(sticker)
    const layers = [{ input: glowImg, blend: 'screen' }]
    if (outlineColor !== 'none') layers.push({ input: outlineImg, blend: 'over' })
    layers.push({ input: sticker, blend: 'over' })
    return { layers, width: w, height: h, source }
}

export default { gradeSvg, cinematicGrade, blurFillCompose, proCutout, buildSticker }
