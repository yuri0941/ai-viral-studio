// [COVERS-SUPREME З5] Типографика обложек уровня топов YouTube: Russo One (OFL, кириллица;
// Anton/Bebas Neue кириллицы НЕ имеют — факт по charset, выбор зафиксирован в AGENTS.md).
// Шрифт — файл в репо (backend/assets/fonts/RussoOne-Regular.ttf, 39КБ), рендер — в SVG-пути
// через fontkit: НЕ зависит от fontconfig на хосте (Render Free), детерминирован.
// UPPERCASE, 1–3 строки, авто-фит: размер максимизируется под блок 25–40% кадра и ширину ≤90%;
// градиентная заливка, толстая обводка (paint-order stroke), свечение (feGaussianBlur),
// лёгкий 3D (двойная тень-экструзия), ключевое слово хука — акцентным цветом (per-word path).
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONT_PATH = path.join(__dirname, '../assets/fonts/RussoOne-Regular.ttf')

let fontPromise = null
async function loadFont() {
    if (!fontPromise) {
        fontPromise = (async () => {
            try {
                const fontkit = await import('fontkit') // ESM-обёртка CJS: openSync в именованных
                if (!fs.existsSync(FONT_PATH)) return null
                return fontkit.openSync(FONT_PATH)
            } catch (e) {
                console.warn('[coverTypography] font load failed:', e.message)
                return null
            }
        })()
    }
    return fontPromise
}

export function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Ключевое слово хука — акцент: числа/суперлативы/эмоциональные маркеры, иначе самое длинное слово
const HOOK_MARKERS = /^(топ|лучш|шок|секрет|ошибк|никогда|всегда|бесплатн|миллион|взорв|жесть|запрещ|босс|смерт|трюк|халява|финал|мощь|цена|деньги|это|вот|как|почему|top|best|shock|secret|never|always|free|how|why)/i
export function pickAccentWord(words) {
    if (!words.length) return -1
    const numIdx = words.findIndex(w => /\d/.test(w))
    if (numIdx >= 0) return numIdx
    const hookIdx = words.findIndex(w => HOOK_MARKERS.test(w))
    if (hookIdx >= 0) return hookIdx
    let best = 0
    for (let i = 1; i < words.length; i++) if (words[i].length > words[best].length) best = i
    return best
}

// Разбивка слов на lines строк, баланс по суммарной ширине (пробелы = unit ширины 0.5 слова)
function splitWords(words, lines) {
    if (lines <= 1 || words.length <= 1) return [words]
    let best = null
    const rec = (start, left, acc) => {
        if (left === 1) {
            const cand = [...acc, words.slice(start)]
            const lens = cand.map(l => l.join(' ').length)
            const spread = Math.max(...lens) - Math.min(...lens)
            if (!best || spread < best.spread) best = { lines: cand, spread }
            return
        }
        for (let take = 1; take <= words.length - start - (left - 1); take++) {
            rec(start + take, left - 1, [...acc, words.slice(start, start + take)])
        }
    }
    rec(0, lines, [])
    return best.lines
}

// Слово → SVG path + ширина в единицах шрифта (advance). Пробел — advance пробела шрифта.
function wordRun(font, word) {
    const run = font.layout(word)
    let d = ''
    let x = 0
    for (let i = 0; i < run.glyphs.length; i++) {
        const pos = run.positions[i]
        d += run.glyphs[i].path.translate(x + pos.xOffset, pos.yOffset).toSVG()
        x += pos.xAdvance
    }
    return { d, advance: x }
}

/**
 * SVG-блок типографики → { svg, fontSize, textHeightRatio, blockRatio, lines } | { fallback: true } | null.
 * scheme: 0 белый+плашка (низ-центр), 1 жёлтый акцент (низ-слева), 2 белый (верх-слева).
 */
export async function titleOverlaySvg({ width, height, text, accentColor = '#ffd60a', scheme = 0, effect3d = true, layoutOverride = null }) {
    // [COVERS-SUPREME З7] вертикаль (Shorts/Reels/TikTok): текст СВЕРХУ крупно, объект снизу
    const layout = layoutOverride || (scheme === 2 ? 'top-left' : scheme === 1 ? 'bottom-left' : 'bottom-center')
    const words = String(text || '').trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 6)
    if (!words.length) return null
    const font = await loadFont()
    const minSide = Math.min(width, height)
    if (!font) return { fallback: true, fontSize: Math.round(minSide * 0.09) } // вызывающий рисует легаси-текст

    // кэш wordRun на слово
    const runs = new Map(words.map(w => [w, wordRun(font, w)]))
    const spaceAdv = font.layout(' ').advanceWidth || font.unitsPerEm * 0.3
    const lineWidthAt1 = (lineWords) => lineWords.reduce((s, w) => s + runs.get(w).advance, 0) + spaceAdv * (lineWords.length - 1)

    // Выбор разбивки: максимизируем fontSize (ширина ≤90% кадра, блок ≤40% меньшей стороны)
    const upem = font.unitsPerEm
    let best = null
    const maxLines = Math.min(3, words.length)
    for (let lc = 1; lc <= maxLines; lc++) {
        const lineWordsArr = splitWords(words, lc)
        const widest = Math.max(...lineWordsArr.map(lineWidthAt1))
        if (!widest) continue
        const byWidth = (width * 0.9) / (widest / upem)
        const byHeight = (minSide * 0.38) / (lc * 1.12)
        const fontSize = Math.floor(Math.min(byWidth, byHeight))
        if (!best || fontSize > best.fontSize) best = { fontSize, lines: lineWordsArr }
    }
    if (!best) return null
    const fontSize = Math.max(best.fontSize, Math.round(minSide * 0.07))
    const scale = fontSize / upem
    const lineHeight = Math.round(fontSize * 1.12)
    const blockH = lineHeight * best.lines.length
    const padX = Math.round(fontSize * 0.5)
    const isTop = layout.startsWith('top')
    const alignLeft = layout !== 'bottom-center' && layout !== 'top-center'
    const rectY = isTop
        ? Math.round(height * 0.05)
        : Math.max(Math.round(height * 0.1), height - blockH - Math.round(height * 0.07))

    const accentWord = words[pickAccentWord(words)]
    const baseFill = scheme === 1 ? '#ffd60a' : '#ffffff'
    const gid = `tg${scheme}${isTop ? 't' : 'b'}`
    const strokeW = Math.max(3, fontSize * 0.08) / scale // в единицах шрифта
    const glowStd = Math.max(4, Math.round(fontSize * 0.13))
    const extrude = effect3d ? Math.max(3, Math.round(fontSize * 0.045)) : 0

    const lineEls = best.lines.map((lineWords, li) => {
        const lineW = lineWidthAt1(lineWords) * scale
        let x = alignLeft ? Math.round(padX * 1.6) : Math.round((width - lineW) / 2)
        const yBaseline = rectY + Math.round(fontSize * 0.85) + li * lineHeight
        const parts = []
        if (extrude) {
            const dAll = lineWords.map(w => runs.get(w).d).join('')
            let ex = x
            let dOffsets = ''
            for (let wi = 0; wi < lineWords.length; wi++) {
                const r = runs.get(lineWords[wi])
                dOffsets += `<path d="${r.d}" transform="translate(${ex + extrude * 2},${yBaseline + extrude * 2}) scale(${scale},${-scale})" fill="rgba(0,0,0,0.55)"/>`
                ex += Math.round((r.advance + spaceAdv) * scale)
            }
            parts.push(dOffsets)
            void dAll
        }
        for (let wi = 0; wi < lineWords.length; wi++) {
            const w = lineWords[wi]
            const r = runs.get(w)
            const fill = w === accentWord ? accentColor : `url(#${gid})`
            parts.push(`<path d="${r.d}" transform="translate(${x},${yBaseline}) scale(${scale},${-scale})" fill="${fill}" stroke="rgba(0,0,0,0.92)" stroke-width="${strokeW.toFixed(1)}" stroke-linejoin="round" paint-order="stroke" filter="url(#glow${gid})"/>`)
            x += Math.round((r.advance + spaceAdv) * scale)
        }
        return parts.join('')
    }).join('\n')

    const plaque = layout === 'bottom-center' || layout === 'top-center'
        ? `<rect x="${padX}" y="${rectY - Math.round(fontSize * 0.22)}" width="${width - padX * 2}" height="${blockH + Math.round(fontSize * 0.42)}" rx="${Math.round(fontSize * 0.28)}" fill="rgba(0,0,0,0.42)"/>`
        : ''
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="${baseFill}"/><stop offset="1" stop-color="${scheme === 1 ? '#f0a500' : '#c9d4ff'}"/>
    </linearGradient>
    <filter id="glow${gid}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${glowStd}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${plaque}
  ${lineEls}
</svg>`
    return {
        svg: Buffer.from(svg),
        fontSize,
        minSide,
        textHeightRatio: fontSize / minSide,
        blockRatio: blockH / height,
        lines: best.lines.length,
    }
}

export default { titleOverlaySvg, splitTitleLines: (t, n) => { const w = String(t || '').trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 6); return w.length ? splitWords(w, Math.min(n || 3, w.length)).map(l => l.join(' ')) : [] }, pickAccentWord, escapeXml }
