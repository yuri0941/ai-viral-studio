// [COVERS-SUPREME З6] AI-скор варианта обложки по CTR-чек-листу (0–100): размер лица/объекта,
// эмоция, контраст текста к фону, цветовой поп, читаемость в миниатюре (сетка 320px и 160px).
// Всё измеряется фактом по собранному варианту (sharp), без LLM-фантазий; эмоция — из
// frameIntelligence (vision при наличии ключа). Лучший вариант идёт первым (best:true).
import sharp from 'sharp'

async function regionLuma(buffer, { left, top, width, height }) {
    try {
        const meta = await sharp(buffer).metadata()
        const W = meta.width || 0, H = meta.height || 0
        const l = Math.max(0, Math.min(W - 8, Math.round(left)))
        const t = Math.max(0, Math.min(H - 8, Math.round(top)))
        const w = Math.max(8, Math.min(W - l, Math.round(width)))
        const h = Math.max(8, Math.min(H - t, Math.round(height)))
        // sharp: stats() игнорирует extract в пайплайне (считает по входу) — материализуем регион
        const regionBuf = await sharp(buffer).extract({ left: l, top: t, width: w, height: h }).toBuffer()
        const stats = await sharp(regionBuf).stats()
        const m = stats.channels
        return m?.length >= 3 ? (0.2126 * m[0].mean + 0.7152 * m[1].mean + 0.0722 * m[2].mean) : null
    } catch { return null }
}

/**
 * Скор собранного варианта. meta: { textHeightRatio, fontSize, textBand {y,h,scheme} | null,
 * stickerAreaRatio, emotion (0..1|null), width, height }.
 */
export async function scoreCover(buffer, meta = {}) {
    const stats = await sharp(buffer).stats().catch(() => null)
    const sats = stats ? (stats.channels?.[0]?.stdev || 0) + (stats.channels?.[1]?.stdev || 0) + (stats.channels?.[2]?.stdev || 0) : 0
    // цветовой поп: насыщенность/разброс каналов
    const colorPop = Math.min(1, sats / 165)
    // читаемость в миниатюре: px рендера текста в сетке 320px (и штраф, если <10px в 160px)
    const w = meta.width || 1280
    const px320 = (meta.textHeightRatio || 0) * (Math.min(w, meta.height || 720)) * (320 / w)
    const px160 = px320 / 2
    const readability = Math.min(1, px320 / 14) * (px160 >= 5 ? 1 : 0.75)
    // контраст текста к фону: яркость полосы текста vs цвет текста схемы
    let textContrast = 0.6
    if (meta.textBand) {
        const luma = await regionLuma(buffer, { left: 0, top: meta.textBand.y, width: w, height: meta.textBand.h })
        if (luma !== null) {
            const textLuma = meta.textBand.scheme === 1 ? 205 : 235 // жёлтый/белый
            textContrast = Math.min(1, Math.abs(textLuma - luma) / 160)
        }
    }
    const subjectSize = Math.min(1, (meta.stickerAreaRatio || 0) / 0.18) // 30–50% высоты ≈ ≥18% площади
    const emotion = meta.emotion ?? 0.45 // нет vision — нейтраль
    const score = Math.round(100 * (
        0.22 * subjectSize +
        0.18 * emotion +
        0.25 * textContrast +
        0.15 * colorPop +
        0.20 * readability
    ))
    return {
        score: Math.max(1, Math.min(100, score)),
        breakdown: {
            subject: Math.round(subjectSize * 100),
            emotion: Math.round(emotion * 100),
            textContrast: Math.round(textContrast * 100),
            colorPop: Math.round(colorPop * 100),
            readability: Math.round(readability * 100),
        },
    }
}

export default { scoreCover }
