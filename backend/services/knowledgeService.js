// [KNOWLEDGE-PACK] Загрузчик базы вирусных знаний (backend/knowledge/*.json, MIT-источники).
// Версионируемо, hot-reload ≤60с по mtime — обновление JSON применяется без деплоя логики.
// Сборка компактных промпт-блоков для aiService/omega-роутов (EN приоритет, RU полноценно).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge')

const TTL_MS = 60 * 1000
const cache = new Map() // name -> { value, mtimeMs, at }

export function getKnowledge(name) {
    const safe = String(name || '').replace(/[^a-z0-9-]/gi, '')
    if (!safe) return null
    const file = path.join(KNOWLEDGE_DIR, `${safe}.json`)
    try {
        const stat = fs.statSync(file)
        const hit = cache.get(safe)
        if (hit && hit.mtimeMs === stat.mtimeMs && Date.now() - hit.at < TTL_MS) return hit.value
        const value = JSON.parse(fs.readFileSync(file, 'utf8'))
        cache.set(safe, { value, mtimeMs: stat.mtimeMs, at: Date.now() })
        return value
    } catch (e) {
        console.warn(`[knowledge] load ${safe} failed:`, e.message)
        return cache.get(safe)?.value || null
    }
}

export function knowledgeVersions() {
    const out = {}
    for (const f of fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'))) {
        const k = getKnowledge(f.replace(/\.json$/, ''))
        out[f.replace(/\.json$/, '')] = k?.version || null
    }
    return out
}

const L = (lang) => (String(lang).toLowerCase().startsWith('ru') ? 'ru' : 'en')
const pick = (obj, lang) => (obj && typeof obj === 'object' ? (obj[L(lang)] ?? obj.en ?? '') : obj || '')

// Компактный блок формул хуков для промпта (id, имя, форма, пример — без regex-служебки)
export function buildHooksBlock(lang = 'ru', { max = 12 } = {}) {
    const k = getKnowledge('hooks')
    if (!k) return ''
    const rules = (pick(k.rules, lang) || []).slice(0, 8).map(r => `- ${r}`).join('\n')
    const hooks = (k.hooks || []).slice(0, max)
        .map(h => `- ${h.id} (${lang === 'ru' ? h.nameRu : h.name}): ${pick(h.shape, lang)} Пример: ${pick(h.example, lang)}`)
        .join('\n')
    return lang === 'ru'
        ? `ФОРМУЛЫ ВИРУСНЫХ ХУКОВ (мировые методики, knowledge-pack v${k.version}):\n${rules}\n${hooks}`
        : `VIRAL HOOK FORMULAS (knowledge-pack v${k.version}):\n${rules}\n${hooks}`
}

export function buildTitlesBlock(lang = 'ru') {
    const k = getKnowledge('titles')
    if (!k) return ''
    const formulas = (k.formulas || [])
        .map(f => `- ${f.id} (${lang === 'ru' ? f.nameRu : f.name}): ${pick(f.skeleton, lang)}`)
        .join('\n')
    const micro = (pick(k.microRules, lang) || []).map(r => `- ${r}`).join('\n')
    return lang === 'ru'
        ? `ФОРМУЛЫ ТАЙТЛОВ 2026 (knowledge-pack v${k.version}):\n${formulas}\nМИКРО-ПРАВИЛА:\n${micro}`
        : `TITLE FORMULAS 2026 (knowledge-pack v${k.version}):\n${formulas}\nMICRO-RULES:\n${micro}`
}

export function buildSeoBlock(lang = 'ru') {
    const k = getKnowledge('seo')
    if (!k) return ''
    const rules = (pick(k.description?.rules, lang) || []).map(r => `- ${r}`).join('\n')
    const chapters = (pick(k.chapters?.rules, lang) || []).map(r => `- ${r}`).join('\n')
    const tags = pick(k.tags?.honesty, lang)
    return lang === 'ru'
        ? `SEO-СТРУКТУРА ОПИСАНИЯ (knowledge-pack v${k.version}):\n${rules}\nГЛАВЫ:\n${chapters}\nТЕГИ: ${tags}`
        : `DESCRIPTION SEO STRUCTURE (knowledge-pack v${k.version}):\n${rules}\nCHAPTERS:\n${chapters}\nTAGS: ${tags}`
}

export function buildPackagingBlock(lang = 'ru') {
    const k = getKnowledge('packaging')
    if (!k) return ''
    return pick(k.pairRule, lang)
}

export function buildAlgorithmBlock(lang = 'ru') {
    const k = getKnowledge('algorithm')
    if (!k) return ''
    const first30 = (pick(k.firstSeconds?.longform30, lang) || []).map(r => `- ${r}`).join('\n')
    const first3 = (pick(k.firstSeconds?.shorts3, lang) || []).map(r => `- ${r}`).join('\n')
    return lang === 'ru'
        ? `АЛГОРИТМ 2026 (knowledge-pack v${k.version}): ${pick(k.coreModel, lang)}\nПЕРВЫЕ 30 СЕКУНД:\n${first30}\nПЕРВЫЕ 3 СЕКУНДЫ (SHORTS):\n${first3}`
        : `ALGORITHM 2026 (knowledge-pack v${k.version}): ${pick(k.coreModel, lang)}\nFIRST 30s:\n${first30}\nFIRST 3s (SHORTS):\n${first3}`
}

// Спека упаковки под конкретную площадку (VK/Дзен исключены решением владельца — вернёт null)
export function getPlatformSpec(platformId, lang = 'ru') {
    const k = getKnowledge('platforms')
    if (!k) return null
    const p = (k.platforms || []).find(x => x.id === String(platformId || '').toLowerCase() && x.enabled)
    if (!p) return null
    return { ...p, styleText: pick(p.style, lang) }
}

export function listEnabledPlatforms() {
    const k = getKnowledge('platforms')
    return (k?.platforms || []).filter(p => p.enabled).map(p => p.id)
}

// СНГ-паттерны — только для RU-пакетов
export function buildCisBlock() {
    const k = getKnowledge('cis')
    if (!k) return ''
    const p = k.patterns || {}
    const lines = [
        `Форма обращения: ${p.addressForm?.rule || ''}`,
        `Деньги: ${p.moneyFraming?.rule || ''}`,
        `Скепсис: ${p.skepticismGuard?.rule || ''}`,
        `Разговорные маркеры: ${p.colloquialMarkers?.rule || ''}`,
        `Поисковые вопросы: ${p.questionForms?.rule || ''}`,
    ]
    return `СНГ-ПАТТЕРНЫ ДЛЯ RU-ПАКЕТА (knowledge-pack v${k.version}):\n${lines.join('\n')}`
}

export default {
    getKnowledge,
    knowledgeVersions,
    buildHooksBlock,
    buildTitlesBlock,
    buildSeoBlock,
    buildPackagingBlock,
    buildAlgorithmBlock,
    buildCisBlock,
    getPlatformSpec,
    listEnabledPlatforms,
}
