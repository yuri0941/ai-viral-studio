// [KNOWLEDGE-PACK З4] Детерминированный скоринг вирусной упаковки — JS-порт hookscore.py
// (5 свойств, вердикт = 60% среднего + 40% слабейшего звена) и title.py (линт тайтла +
// линт пары «тайтл↔текст обложки»). Источники MIT. Списки слов/формулы — из backend/knowledge
// (hot-reload), RU-наборы добавлены для кириллицы. Без LLM — считается мгновенно, везде.
import { getKnowledge } from './knowledgeService.js'

const FILLER = {
    en: new Set(['basically', 'actually', 'literally', 'just', 'really', 'very', 'so', 'kind', 'sort', 'like', 'guys', 'hey', 'welcome', 'today', 'video', 'subscribe', 'channel']),
    ru: new Set(['короче', 'вообще', 'просто', 'очень', 'типа', 'как бы', 'вот это', 'ребят', 'ребята', 'привет', 'сегодня', 'видео', 'подписывайтесь', 'канал']),
}
const RE = {
    concrete: /\b(\d[\d,.]*\s?(%|k|m|x)?|[$₽]\s?\d[\d\s]*|\d+\s?(second|minute|hour|day|week|month|year|секунд\w*|минут\w*|час\w*|дн\w*|недел\w*|месяц\w*|год\w*|лет)\w*)/i,
    you: /\b(you|your|you're|youre|yourself|вы|ты|ваш\w*|тво\w*|вам|тебе|вас|тебя)\b/i,
    stake: /\b(lose|lost|wasting|waste|quit|fail|broke|cost|risk|before|stop|never|die|dying|dead|теря\w+|слива\w+|убива\w+|ошибк\w+|провал\w*|стоп|хватит|перестань\w*|никогда|пока не|до того как)\b/i,
    curiosity: /\b(why|how|what|which|until|before|but|nobody|almost|except|reason|actually|почему|как|что|когда|зачем|пока|но|никто|почти|кроме|причин\w*|на самом деле)\b/i,
    closedLoop: /\b(because|so that|which means|потому что|поэтому|а именно)\b/i,
}

const wordsOf = (t, lang) => {
    const rx = lang === 'ru' ? /[a-zа-яё0-9'%$₽.]+/gi : /[a-z0-9'%$.]+/g
    return (String(t).toLowerCase().match(rx) || [])
}
const langOf = (t) => (/[а-яё]/i.test(String(t)) ? 'ru' : 'en')

// JS \b — только ASCII: кириллица у \b не «word char», RU-паттерны молча не матчились.
// b() переводит \b в юникодную границу (край строки / пробел / пунктуация) — для .test() этого достаточно.
const b = (p, flags = 'iu') => new RegExp(String(p).replace(/\\b/g, '([\\s\\p{P}]|^|$)'), flags)

function lintLists() {
    const k = getKnowledge('titles') || {}
    const lint = k.lint || {}
    return {
        vague: { en: new Set(lint.vagueWords?.en || []), ru: new Set([...(lint.vagueWords?.en || []), ...(lint.vagueWords?.ru || [])]) },
        stop: { en: new Set(lint.stopWords?.en || []), ru: new Set([...(lint.stopWords?.en || []), ...(lint.stopWords?.ru || [])]) },
        aiMarkers: { en: new Set(lint.aiMarkers?.en || []), ru: new Set([...(lint.aiMarkers?.en || []), ...(lint.aiMarkers?.ru || [])]) },
        limits: k.limits || { hardCap: 100, desktopCut: 60, mobileCut: 40, maxCapsWords: 2, maxEmDash: 1, thumbnailMaxWords: 4 },
    }
}

// --- Хук: 5 свойств × 0–100, вердикт со слабейшим звеном (hookscore.py, MIT) ---
export function scoreHook(text, lang) {
    const t = String(text || '').trim()
    const lg = lang || langOf(t)
    const w = wordsOf(t, lg)
    const { vague } = lintLists()
    if (!w.length) return { verdict: 0, band: 'WEAK', properties: {}, formula: 'Unclassified', matched: 0 }

    const nums = (t.match(b(RE.concrete.source, 'giu')) || []).length
    const vagueN = w.filter(x => vague[lg === 'ru' ? 'ru' : 'en'].has(x)).length
    const fillerN = w.filter(x => FILLER[lg].has(x)).length
    const proper = t.split(/\s+/).slice(1).filter(x => /^[A-ZА-ЯЁ]/.test(x)).length
    const specificity = clamp(34 + nums * 22 - vagueN * 16 - fillerN * 5 + Math.min(18, proper * 6))

    const youN = (t.match(b(RE.you.source, 'giu')) || []).length
    const first6 = t.split(/\s+/).slice(0, 6).join(' ')
    const address = clamp(26 + youN * 20 + (b(RE.you.source).test(first6) ? 30 : 0))

    const stakeN = (t.match(b(RE.stake.source, 'giu')) || []).length
    const stakes = clamp(22 + stakeN * 26 + (b(RE.concrete.source).test(t) ? 14 : 0))

    const curN = (t.match(b(RE.curiosity.source, 'giu')) || []).length
    const curiosity = clamp(24 + curN * 17 + (t.endsWith('?') ? 18 : 0) + (b(RE.closedLoop.source).test(t) ? -18 : 0))

    const n = w.length
    const brevity = n >= 9 && n <= 24 ? 100 : n < 9 ? Math.max(30, 100 - (9 - n) * 11) : Math.max(10, 100 - (n - 24) * 7)

    const properties = { SPECIFICITY: specificity, ADDRESS: address, STAKES: stakes, CURIOSITY: curiosity, BREVITY: brevity }
    const vals = Object.values(properties)
    const verdict = Math.round(0.6 * (vals.reduce((a, b) => a + b, 0) / vals.length) + 0.4 * Math.min(...vals))
    const { formula, hits } = classifyHook(t, lg)
    return { verdict, band: verdict >= 72 ? 'STRONG' : verdict >= 55 ? 'WORKABLE' : 'WEAK', properties, formula, matched: hits }
}

// Классификация по формулам knowledge/hooks.json (match-паттерны en+ru)
export function classifyHook(text, lang) {
    const k = getKnowledge('hooks')
    let best = 'Unclassified'
    let hits = 0
    for (const f of k?.hooks || []) {
        const pats = [...(f.match?.en || []), ...(f.match?.ru || [])]
        const n = pats.filter(p => { try { return b(p).test(text) } catch { return false } }).length
        if (n > hits) { hits = n; best = lang === 'ru' ? (f.nameRu || f.name) : f.name }
    }
    return { formula: best, hits }
}

// --- Тайтл: линт (title.py, MIT) + длина/КАПС/цифра/AI-маркеры, EN+RU ---
export function scoreTitle(title, { thumb = '', lang } = {}) {
    const t = String(title || '').trim()
    const lg = lang || langOf(t)
    const { vague, stop, aiMarkers, limits } = lintLists()
    const issues = []
    const good = []
    const n = t.length
    if (n > limits.hardCap) issues.push({ kind: 'length', msg: `${n} chars — hard cap is ${limits.hardCap}` })
    else if (n > limits.desktopCut) issues.push({ kind: 'length', msg: `${n} chars — desktop search cuts near ${limits.desktopCut}` })
    else if (n > 0) good.push(`${n} chars, inside the ${limits.desktopCut}-char desktop cut`)
    if (n > limits.mobileCut) {
        const head = t.slice(0, limits.mobileCut).replace(/\s+\S*$/, '')
        issues.push({ kind: 'mobile', msg: `mobile feed shows about "${head}…" — check the subject survives` })
    }
    const caps = t.split(/\s+/).filter(x => x.length > 2 && x === x.toUpperCase() && /[A-ZА-ЯЁ]/.test(x))
    if (caps.length > limits.maxCapsWords) issues.push({ kind: 'shouting', msg: `${caps.length} all-caps words — ${limits.maxCapsWords} is the ceiling` })
    else if (caps.length) good.push(`${caps.length} all-caps word for emphasis`)
    const w = wordsOf(t, lg)
    const vHit = w.filter(x => vague[lg === 'ru' ? 'ru' : 'en'].has(x))
    if (vHit.length) issues.push({ kind: 'vague', msg: `${[...new Set(vHit)].join(', ')} — swap for a number, a name or a date` })
    const aiHit = w.filter(x => aiMarkers[lg === 'ru' ? 'ru' : 'en'].has(x))
    if (aiHit.length) issues.push({ kind: 'ai-vocab', msg: `AI vocabulary in a one-line title: ${[...new Set(aiHit)].join(', ')}` })
    const emDash = (t.match(/—/g) || []).length
    if (emDash > limits.maxEmDash) issues.push({ kind: 'emdash', msg: `${emDash} em dashes — max ${limits.maxEmDash}` })
    const nums = t.match(/\d[\d,.]*%?/g)
    if (nums) good.push(`carries a concrete figure (${nums.slice(0, 3).join(', ')})`)
    else issues.push({ kind: 'no-number', msg: 'no number, date or name — the most reliable single fix' })
    const stopSet = stop[lg === 'ru' ? 'ru' : 'en']
    if (!w.slice(0, 3).some(x => !stopSet.has(x))) issues.push({ kind: 'front-load', msg: 'the first three words are all filler — move the subject forward' })
    const pair = thumb ? lintPair(t, thumb, lg) : null
    if (pair) {
        if (pair.duplicate) issues.push({ kind: 'duplicate', msg: `thumbnail repeats the title on: ${pair.shared.join(', ')}` })
        else good.push('thumbnail and title carry different words')
        if (pair.thumbWords > limits.thumbnailMaxWords) issues.push({ kind: 'thumb-length', msg: `${pair.thumbWords} words on the thumbnail — ${limits.thumbnailMaxWords} is the ceiling` })
    }
    const score = clamp(100 - 14 * issues.length + 4 * good.length)
    return { title: t, chars: n, score, band: score >= 72 ? 'STRONG' : score >= 55 ? 'WORKABLE' : 'WEAK', issues, good, pair }
}

// --- Пара «тайтл ↔ текст обложки»: дубль значимых слов (З2) ---
export function lintPair(title, coverText, lang) {
    const t = String(title || '').trim()
    const h = String(coverText || '').trim()
    if (!t || !h) return { duplicate: false, shared: [], thumbWords: wordsOf(h, lang || langOf(h)).length }
    const lg = lang || langOf(t + ' ' + h)
    const { stop, limits } = lintLists()
    const stopSet = stop[lg === 'ru' ? 'ru' : 'en']
    const tw = new Set(wordsOf(t, lg).filter(x => !stopSet.has(x)))
    const hw = new Set(wordsOf(h, lg).filter(x => !stopSet.has(x)))
    const shared = [...tw].filter(x => hw.has(x))
    return {
        duplicate: shared.length >= (getKnowledge('packaging')?.dupLint?.minSharedWordsToFlag ?? 1),
        shared,
        thumbWords: wordsOf(h, lg).length,
        thumbWordCap: limits.thumbnailMaxWords,
    }
}

// Скоринг списка вариантов тайтлов: лучший первым (паттерн AI-скора обложек)
export function rankTitles(titles, { thumb = '', lang } = {}) {
    return (Array.isArray(titles) ? titles : [])
        .map(t => scoreTitle(t, { thumb, lang }))
        .sort((a, b) => b.score - a.score)
        .map((r, i) => ({ ...r, best: i === 0 }))
}

export function rankHooks(hooks, lang) {
    return (Array.isArray(hooks) ? hooks : [])
        .map(h => ({ hook: h, ...scoreHook(h, lang) }))
        .sort((a, b) => b.verdict - a.verdict)
        .map((r, i) => ({ ...r, best: i === 0 }))
}

function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))) }

export default { scoreHook, scoreTitle, lintPair, rankTitles, rankHooks, classifyHook }
