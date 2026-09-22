// [COVERS-SUPREME З1] NICHE-ADAPTIVE: пресет стиля обложки из РЕАЛЬНЫХ топ-обложек ниши
// (YouTube Data API — существующий youtubeDataService, ключ из кабинета). Берём топ видео ниши,
// качаем их thumbnail, извлекаем паттерны ПО ПИКСЕЛЯМ: доминирующие насыщенные цвета, среднюю
// яркость/насыщенность (сила цветокора), присутствие лица (skin-кластеры), объём текста
// (энергия краёв в текстовых третях), эмоцию (маркеры в реальных заголовках топов).
// Нет данных ниши (нет ключа/квоты/пусто) → универсальный вирусный пресет — честный фолбэк,
// обложка собирается ВСЕГДА. Кэш 30 мин (TtlLruCache): повторная генерация не дёргает API.
import sharp from 'sharp'
import axios from 'axios'
import { TtlLruCache } from '../utils/ttlLruCache.js'

const presetCache = new TtlLruCache({ ttlMs: 30 * 60 * 1000, maxEntries: 50 })

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l }
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    return { h: h * 360, s, l }
}

function hslToHex(h, s, l) {
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
        const k = (n + h / 30) % 12
        const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
        return Math.round(c * 255).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

// Пиксельный паттерн одного thumbnail: доминирующий насыщенный цвет, яркость, насыщенность,
// skin-доля (лицо), текст-энергия в верхней/нижней трети (объём текста на обложке)
async function thumbnailPattern(buffer) {
    const W = 96, H = 54
    const { data, info } = await sharp(buffer).resize(W, H, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
    let sumL = 0, sumS = 0, skin = 0
    let bestSat = { s: 0, h: 0 }
    const edgeScore = [0, 0] // top third, bottom third — градиент яркости (текст/плашки)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 3
            const r = data[i], g = data[i + 1], b = data[i + 2]
            const { h, s, l } = rgbToHsl(r, g, b)
            sumL += l; sumS += s
            if (s > 0.45 && l > 0.25 && l < 0.8 && s > bestSat.s) bestSat = { s, h }
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
            if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) skin++
            if (x > 0 && (y < H / 3 || y >= (H * 2) / 3)) {
                const li = (y * W + x - 1) * 3
                edgeScore[y < H / 3 ? 0 : 1] += Math.abs((r + g + b) - (data[li] + data[li + 1] + data[li + 2])) / 3
            }
        }
    }
    const n = W * H
    return {
        dominantHue: bestSat.h,
        dominantSat: bestSat.s,
        meanLuma: sumL / n,
        meanSat: sumS / n,
        skinRatio: skin / n,
        textEnergy: (edgeScore[0] + edgeScore[1]) / (W * (H / 3) * 2) / 64,
    }
}

// Эмоция ниши — по РЕАЛЬНЫМ заголовкам топов (не выдуманная): маркеры шока/энергии
const EMOTION_RE = /(шок|невероят|секрет|запрещ|разоблач|взорв|жесть|скандал|ошибк|никогда|insane|shock|secret|never|mistake)/i

export const UNIVERSAL_PRESET = {
    source: 'universal',
    accentColor: '#ffd60a',
    gradeSaturation: 1.22,
    gradeContrast: 1.07,
    vignette: 0.42,
    faceBias: 0.6,
    textHeavy: true,
    mood: 'energy',
}

/**
 * Пресет стиля ниши → применяется к обложке ЭТОГО видео (цветокор/акцент/плашки).
 * Источник — только реальные данные; без ключа YouTube → UNIVERSAL_PRESET.
 */
export async function getNicheStylePreset({ topic = '', niche = '', ownerId = null } = {}) {
    const query = String(niche || topic || '').trim().slice(0, 120)
    if (!query) return { ...UNIVERSAL_PRESET }
    const cacheKey = query.toLowerCase()
    const cached = presetCache.get(cacheKey)
    if (cached) return cached

    let preset = { ...UNIVERSAL_PRESET }
    try {
        const yt = await import('./youtubeDataService.js')
        const search = await yt.searchYoutubeVideos(query, { maxResults: 5, ownerId })
        if (search.available && Array.isArray(search.videos) && search.videos.length) {
            const thumbs = []
            for (const v of search.videos.slice(0, 4)) {
                const url = v.thumbnail
                if (!url) continue
                try {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000 })
                    const buf = Buffer.from(res.data)
                    if (buf.length > 3000) thumbs.push({ buf, title: v.title || '' })
                } catch { /* один битый thumbnail не роняет пресет */ }
            }
            const patterns = []
            for (const t of thumbs) {
                const p = await thumbnailPattern(t.buf).catch(() => null)
                if (p) patterns.push({ ...p, title: t.title })
            }
            if (patterns.length >= 2) {
                const avg = (k) => patterns.reduce((s, p) => s + p[k], 0) / patterns.length
                const dominantHue = patterns.sort((a, b) => b.dominantSat - a.dominantSat)[0].dominantHue
                const meanSat = avg('meanSat')
                const meanLuma = avg('meanLuma')
                const skinRatio = avg('skinRatio')
                const emotionHits = patterns.filter(p => EMOTION_RE.test(p.title)).length
                preset = {
                    source: 'niche',
                    // акцент = доминирующий насыщенный цвет ниши, доведённый до читаемого
                    accentColor: hslToHex(dominantHue, 0.95, 0.55),
                    gradeSaturation: meanSat > 0.32 ? 1.28 : 1.16, // ниша сочная → усиливаем
                    gradeContrast: meanLuma < 0.38 ? 1.1 : 1.05,
                    vignette: 0.42,
                    faceBias: skinRatio > 0.015 ? 1.0 : 0.4, // ниша лицевая → лицо важнее
                    textHeavy: avg('textEnergy') > 0.35,
                    mood: emotionHits >= patterns.length / 2 ? 'shock' : 'energy',
                    sampleCount: patterns.length,
                    dominantHue: Math.round(dominantHue),
                }
            }
        }
    } catch (e) {
        console.warn('[nicheStyle] preset failed:', e.message)
    }
    presetCache.set(cacheKey, preset)
    return preset
}

export default { getNicheStylePreset, UNIVERSAL_PRESET }
