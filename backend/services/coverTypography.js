// [COVERS-SUPREME З5] Типографика обложек уровня топов YouTube: Russo One (OFL, кириллица;
// Anton/Bebas Neue кириллицы НЕ имеют — факт по charset, выбор зафиксирован в AGENTS.md).
// Шрифт — файл в репо (backend/assets/fonts/RussoOne-Regular.ttf, 39КБ), рендер — в SVG-пути
// через fontkit: НЕ зависит от fontconfig на хосте (Render Free), детерминирован.
// UPPERCASE, 1–3 строки, авто-фит по ширине (блок 25–40% кадра), градиентная заливка,
// толстая обводка (paint-order stroke), свечение (feGaussianBlur), лёгкий 3D (двойная
// тень-экструзия), ключевое слово хука — акцентным цветом.
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
                const fontkit = (await import('fontkit')).default
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
const HOOK_MARKERS = /^(топ|лучш|шок|секрет|ошибк|никогда|всегда|бесплатн|миллион|новый|новая|новое|как|почему|запрещ|запрет|взорв|это|вот|жесть|халява|цена|деньги|уровень|босс|финал|смерт|лайфхак|трюк|мощь|сила)/i
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

// Разбивка на 1–3 строки (слова ≤ 6), баланс по длине строк
export function splitTitleLines(text, maxLines = 3) {
    const words = String(text || '').trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 6)
    if (!words.length) return []
    if (words.length === 1) return [words]
    let best = null
    const count = Math.min(maxLines, words.length)
    for (let lines = 1; lines <= count; lines++) {
        // перебор разбиений для lines ≤ 3 и слов ≤ 6 — копеечный
        const splitIdx = []
        const rec = (start, left, acc) => {
            if (left === 1) { splitIdx.push([...acc, words.slice(start)]); return }
            for (let take = 1; take <= words.length - start - (left - 1); take++) rec(start + take, left - 1, [...acc, words.slice(start, start + take)])
        }
        rec(0, lines, [])
        for (const cand of splitIdx) {
            const lens = cand.map(l => l.join(' ').length)
            const spread = Math.max(...lens) - Math.min(...lens)
            if (!best || spread < best.spread) best = { lines: cand.map(l => l.join(' ')), spread }
        }
    }
    return best ? best.lines : [words.join(' ')]
}

// Все глифы строки → один SVG path (координаты шрифта, y вверх; масштаб — снаружи)
function lineToPath(font, line) {
    const run = font.layout(line)
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
 * SVG-блок типографики. Возвращает { svg, fontSize, textHeightRatio, blockRatio, lines } | null.
 * opts: width, height, text, accentColor (hex), scheme: 0 белый/плашка, 1 жёлтый акцент, 2 белый/верх,
 *       layout: 'bottom-center'|'bottom-left'|'top-left', effect3d: bool
 */
export async function titleOverlaySvg({ width, height, text, accentColor = '#ffd60a', scheme = 0, layout = 'bottom-center', effect3d = true }) {
    const font = await loadFont()
    const lines = splitTitleLines(text)
    if (!lines.length) return null
    const minSide = Math.min(width, height)
    // блок текста 25–40% кадра (по меньшей стороне); авто-фит по ширине 84%
    const targetBlock = minSide * 0.32
    const lineHeightRatio = 1.08
    let fontSize = Math.round(targetBlock / (lines.length * lineHeightRatio))
    fontSize = Math.max(Math.round(minSide * 0.085), Math.min(fontSize, Math.round(minSide * (0.4 / Math.max(1, lines.length - 0.4)))))

    if (!font) return { fallback: true, lines, fontSize } // шрифт не загрузился — вызывающий рисует легаси-текст

    const scale = fontSize / font.unitsPerEm
    const lineHeight = Math.round(fontSize * lineHeightRatio)
    const rendered = lines.map(line => {
        const { d, advance } = lineToPath(font, line)
        return { d, widthPx: advance * scale, line }
    })
    const maxTextW = width * 0.84
    const widest = Math.max(...rendered.map(r => r.widthPx))
    if (widest > maxTextW) { // авто-фит: сжатие до ширины кадра
        const shrink = maxTextW / widest
        fontSize = Math.max(Math.round(minSide * 0.06), Math.floor(fontSize * shrink))
        const sc2 = fontSize / font.unitsPerEm
        for (const r of rendered) r.widthPx = r.widthPx * (sc2 / scale)
    }
    const finalScale = fontSize / font.unitsPerEm
    const blockH = Math.round(lines.length * lineHeight)
    const padX = Math.round(fontSize * 0.5)
    const isTop = layout === 'top-left'
    const alignLeft = layout !== 'bottom-center'
    const rectY = isTop
        ? Math.round(height * 0.055)
        : Math.min(height - blockH - Math.round(fontSize * 0.4), height - Math.round(height * 0.2) - Math.round(blockH / 2))

    // акцентное слово: первая строка с маркером/числом; акцент красим ВСЮ строку (надёжнее пер-словного path)
    const allWords = lines.flatMap(l => l.split(/\s+/))
    const accentLineIdx = lines.findIndex(l => l.split(/\s+/).some(w => /\d/.test(w) || HOOK_MARKERS.test(w)))
    const accentIdx = accentLineIdx >= 0 ? accentLineIdx : (allWords.length ? lines.findIndex(l => l.includes(allWords[pickAccentWord(allWords)])) : -1)

    const baseFill = scheme === 1 ? '#ffd60a' : '#ffffff'
    const gid = `tg${scheme}${isTop ? 't' : 'b'}`
    const strokeW = Math.max(3, Math.round(fontSize * 0.075))
    const glowStd = Math.max(4, Math.round(fontSize * 0.14))
    const extrude = effect3d ? Math.max(3, Math.round(fontSize * 0.05)) : 0

    const lineEls = rendered.map((r, i) => {
        const yBaseline = rectY + Math.round(fontSize * 0.82) + i * lineHeight
        const x = alignLeft ? Math.round(padX * 1.6) : Math.round((width - r.widthPx) / 2)
        const fill = i === accentIdx ? accentColor : `url(#${gid})`
        const ext = extrude
            ? `<path d="${r.d}" transform="translate(${x + extrude * 2},${yBaseline + extrude * 2}) scale(${finalScale},${-finalScale})" fill="rgba(0,0,0,0.55)"/>`
              + `<path d="${r.d}" transform="translate(${x + extrude},${yBaseline + extrude}) scale(${finalScale},${-finalScale})" fill="rgba(0,0,0,0.35)"/>`
            : ''
        return `${ext}<path d="${r.d}" transform="translate(${x},${yBaseline}) scale(${finalScale},${-finalScale})" fill="${fill}" stroke="rgba(0,0,0,0.9)" stroke-width="${strokeW / finalScale}" stroke-linejoin="round" paint-order="stroke" filter="url(#glow${gid})"/>`
    }).join('\n')

    const plaque = layout === 'bottom-center' && scheme === 0
        ? `<rect x="${padX}" y="${rectY - Math.round(fontSize * 0.18)}" width="${width - padX * 2}" height="${blockH + Math.round(fontSize * 0.3)}" rx="${Math.round(fontSize * 0.3)}" fill="rgba(0,0,0,0.42)"/>`
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
        lines: lines.length,
    }
}

export default { titleOverlaySvg, splitTitleLines, pickAccentWord, escapeXml }
