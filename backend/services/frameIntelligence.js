// [COVERS-SUPREME З2/З3] Интеллект кадра: выбор момента по ЭМОЦИИ, не только по контрасту.
// Эвристика без ключей (всегда): skin-tone кластеры (лицо/человек в кадре, крупность),
// saliency-bbox главного объекта (локальный контраст к размытой копии, центр-буст),
// движение/действие (энергия краёв). Vision (Replicate LLaVA, ключ в кабинете) — поверх:
// эмоция лица (шок/восторг/ярость — CTR-паттерн топов) и действие 0..10; эмоция ПОБЕЖДАЕТ
// контраст при выборе кадра. Любой сбой vision → эвристика (честный фолбэк, не ошибка).
import sharp from 'sharp'
import axios from 'axios'
import { TtlLruCache } from '../utils/ttlLruCache.js'

const LOW_W = 160 // низкое разрешение для пиксельной аналитики

// ── RGB → skin heuristic (правило YCbCr: Cb 77–127, Cr 133–173) ──
function skinMask(raw, w, h) {
    const mask = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
        const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2]
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
        if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) mask[i] = 1
    }
    return mask
}

// Крупнейший связный кластер маски (4-связность, flood fill на 160px — дёшево)
function largestCluster(mask, w, h) {
    const seen = new Uint8Array(w * h)
    let best = null
    for (let i = 0; i < w * h; i++) {
        if (!mask[i] || seen[i]) continue
        let size = 0, minX = w, maxX = 0, minY = h, maxY = 0
        const stack = [i]
        seen[i] = 1
        while (stack.length) {
            const p = stack.pop()
            const x = p % w, y = (p / w) | 0
            size++
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
            if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1) }
            if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1) }
            if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w) }
            if (y < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w) }
        }
        if (!best || size > best.size) best = { size, minX, maxX, minY, maxY }
    }
    return best
}

// Saliency-карта: |пиксель − размытый фон| по яркости → bbox кластера с центр-бустом.
// Это «герой кадра»: стример/блогер, босс, взрыв — самый контрастный объект сцены.
async function saliencyBox(buffer) {
    const meta = await sharp(buffer).metadata()
    const srcW = meta.width || 0, srcH = meta.height || 0
    if (srcW < 32 || srcH < 32) return null
    const lowH = Math.max(16, Math.round(LOW_W * srcH / srcW))
    const { data, info } = await sharp(buffer).resize(LOW_W, lowH, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
    const blur = await sharp(buffer).resize(LOW_W, lowH, { fit: 'fill' }).blur(8).raw().toBuffer({ resolveWithObject: true })
    const w = info.width, h = info.height
    const sal = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
        const dl = Math.abs((data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) - (blur.data[i * 3] + blur.data[i * 3 + 1] + blur.data[i * 3 + 2])) / 3
        sal[i] = dl
    }
    // порог — верхние 12% салиентности
    const sorted = Array.from(sal).sort((a, b) => b - a)
    const thr = sorted[Math.floor(sorted.length * 0.12)] || 1
    const mask = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) if (sal[i] >= thr && thr > 4) mask[i] = 1
    const cl = largestCluster(mask, w, h)
    if (!cl || cl.size < w * h * 0.005) return null
    // центр-буст: кластер у центра кадра — вероятнее герой, чем мусор по краю
    const cx = (cl.minX + cl.maxX) / 2 / w, cy = (cl.minY + cl.maxY) / 2 / h
    const centerDist = Math.hypot(cx - 0.5, cy - 0.45)
    const scaleX = srcW / w, scaleY = srcH / h
    return {
        x: Math.max(0, cl.minX * scaleX), y: Math.max(0, cl.minY * scaleY),
        w: (cl.maxX - cl.minX + 1) * scaleX, h: (cl.maxY - cl.minY + 1) * scaleY,
        areaRatio: (cl.size) / (w * h),
        centerBoost: Math.max(0, 0.55 - centerDist),
    }
}

// Лицо/человек: skin-кластер, предпочтительно верхняя половина (лица), крупность = доля кадра
async function faceBox(buffer) {
    const meta = await sharp(buffer).metadata()
    const srcW = meta.width || 0, srcH = meta.height || 0
    if (srcW < 32 || srcH < 32) return null
    const lowH = Math.max(16, Math.round(LOW_W * srcH / srcW))
    const { data, info } = await sharp(buffer).resize(LOW_W, lowH, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
    const w = info.width, h = info.height
    const cl = largestCluster(skinMask(data, w, h), w, h)
    if (!cl || cl.size < w * h * 0.008) return null
    const scaleX = srcW / w, scaleY = srcH / h
    const box = { x: cl.minX * scaleX, y: cl.minY * scaleY, w: (cl.maxX - cl.minX + 1) * scaleX, h: (cl.maxY - cl.minY + 1) * scaleY }
    return { ...box, areaRatio: cl.size / (w * h), upperBias: 1 - Math.min(1, (cl.minY + cl.maxY) / 2 / h) }
}

// Движение/действие: энергия краёв (модуль градиента яркости), нормированная
async function actionEnergy(buffer) {
    const { data, info } = await sharp(buffer).resize(LOW_W, 90, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
    const w = info.width, h = info.height
    let sum = 0
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        sum += Math.abs(data[i + 1] - data[i - 1]) + Math.abs(data[i + w] - data[i - w])
    }
    return sum / (w * h) / 64 // ~0..1+
}

// ── Vision-скор (Replicate LLaVA): эмоция лица + действие, 0..10. Нет ключа/сбой → null. ──
const visionCache = new TtlLruCache({ ttlMs: 30 * 60 * 1000, maxEntries: 64 })
async function visionEmotionScore(frameBuffer) {
    const key = await (await import('./aiService.js')).getProviderKey('replicate')
    if (!key) return null
    const cacheKey = `emo:${frameBuffer.length}:${frameBuffer.readUInt32LE(100) || 0}:${frameBuffer.readUInt32LE(frameBuffer.length >> 1) || 0}`
    const cached = visionCache.get(cacheKey)
    if (cached !== undefined && cached !== null) return cached
    try {
        const small = await sharp(frameBuffer).resize(384, 216, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()
        const dataUrl = `data:image/jpeg;base64,${small.toString('base64')}`
        const res = await axios.post(
            'https://api.replicate.com/v1/models/yorickvp/llava-13b/predictions',
            { input: { image: dataUrl, prompt: 'Rate this video frame for a YouTube thumbnail. Answer ONLY as JSON: {"emotion":0-10 intensity of facial expression (shock/joy/anger), "action":0-10 movement or epic moment, "face":0-10 how large and clear the main face is, "subject":"short description"}' } },
            { headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json', Prefer: 'wait=25' }, timeout: 45000 }
        )
        const out = res.data?.output
        const text = Array.isArray(out) ? out.join('') : String(out || '')
        const m = /\{[^{}]*"emotion"[\s\S]*?\}/.exec(text)
        if (!m) return null
        const parsed = JSON.parse(m[0])
        const score = {
            emotion: Math.max(0, Math.min(10, Number(parsed.emotion) || 0)),
            action: Math.max(0, Math.min(10, Number(parsed.action) || 0)),
            face: Math.max(0, Math.min(10, Number(parsed.face) || 0)),
            subject: String(parsed.subject || '').slice(0, 120),
        }
        visionCache.set(cacheKey, score)
        return score
    } catch (e) {
        if ([401, 403].includes(e.response?.status)) {
            const { disableProviderKey } = await import('../utils/providerKeyGuard.js')
            await disableProviderKey('replicate', `HTTP ${e.response.status}`).catch(() => {})
        }
        console.warn('[frameIntelligence] vision score failed:', e.message)
        return null
    }
}

/**
 * Полный анализ кадра: { score, heroBox, faceBox, emotion(0..10|null), action(0..1), vision? }
 * Итоговый скор: база (контраст/энтропия из coverGenerator.scoreFrame) + эмоция ×1.4 (побеждает
 * контраст) + лицо крупно ×0.9 + действие ×0.5 + центр-буст героя.
 */
export async function analyzeFrame(buffer, { withVision = true } = {}) {
    const [heroBox, face, action] = await Promise.all([
        saliencyBox(buffer).catch(() => null),
        faceBox(buffer).catch(() => null),
        actionEnergy(buffer).catch(() => 0),
    ])
    let vision = null
    if (withVision) vision = await visionEmotionScore(buffer).catch(() => null)
    const emotion = vision ? vision.emotion / 10 : null
    const faceScore = vision ? vision.face / 10 : (face ? Math.min(1, face.areaRatio * 14) * (0.5 + 0.5 * face.upperBias) : 0)
    const actionScore = vision ? vision.action / 10 : Math.min(1, action)
    const bonus = (emotion !== null ? emotion * 1.4 : 0) + faceScore * 0.9 + actionScore * 0.5 + (heroBox?.centerBoost || 0)
    return {
        bonus, // добавка к контрастному скору pickBestFrames
        heroBox: face && face.areaRatio > 0.01 ? { ...face, kind: 'face' } : heroBox ? { ...heroBox, kind: 'object' } : null,
        faceBox: face,
        emotion,
        action: actionScore,
        vision: !!vision,
        subject: vision?.subject || null,
    }
}

export default { analyzeFrame }
