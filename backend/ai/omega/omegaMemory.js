import { OmegaMemory } from '../../models/index.js'

/**
 * OMEGA Memory — 8-слойная система долговременной и краткосрочной памяти.
 *
 * Слои:
 *  - short_term   — краткосрочные факты (TTL ~10 мин, текущий диалог)
 *  - working      — рабочая память: текущие задачи, черновики, контекст сессии
 *  - long_term    — важные долгосрочные факты, одобренные пользователем или часто используемые
 *  - semantic     — смысловые факты о бизнесе, нише, предпочтениях
 *  - procedural   — инструкции / алгоритмы, как OMEGA должна работать с этим пользователем
 *  - episodic     — эпизодическая память: конкретные события, кампании, результаты
 *  - owner_profile — профиль владельца / пользователя (имя, телефон, Telegram, стиль)
 *  - emotional    — эмоциональный тон, настроение, отношения с пользователем
 */
export const MEMORY_LAYERS = [
    'short_term',
    'working',
    'long_term',
    'semantic',
    'procedural',
    'episodic',
    'owner_profile',
    'emotional',
]

const LAYER_PRIORITY = {
    owner_profile: 10,
    semantic: 9,
    long_term: 8,
    procedural: 7,
    episodic: 6,
    emotional: 5,
    working: 4,
    short_term: 3,
}

const LAYER_TTL_MS = {
    short_term: 10 * 60 * 1000,      // 10 min
    working: 60 * 60 * 1000,         // 1 hour
    long_term: 0,                    // never
    semantic: 0,                     // never
    procedural: 0,                   // never
    episodic: 30 * 24 * 60 * 60 * 1000, // 30 days
    owner_profile: 0,                // never
    emotional: 7 * 24 * 60 * 60 * 1000, // 7 days
}

function isExpired(entry) {
    const ttl = LAYER_TTL_MS[entry.level]
    if (!ttl) return false
    const created = entry.createdAt || entry.updatedAt || new Date()
    return Date.now() - new Date(created).getTime() > ttl
}

function contentToString(content) {
    if (typeof content === 'string') return content
    try {
        return JSON.stringify(content)
    } catch {
        return String(content)
    }
}

/**
 * Получить контекст из памяти для подстановки в промпт.
 */
export async function getMemoryContext(userId, { question = '', limit = 8 } = {}) {
    if (!userId) return ''

    try {
        const doc = await OmegaMemory.findOne({ ownerId: userId }).lean()
        if (!doc || !Array.isArray(doc.entries) || doc.entries.length === 0) {
            return ''
        }

        const questionLower = question.toLowerCase()

        const entries = doc.entries
            .filter(e => MEMORY_LAYERS.includes(e.level) && !isExpired(e))
            .sort((a, b) => {
                const pa = LAYER_PRIORITY[a.level] || 1
                const pb = LAYER_PRIORITY[b.level] || 1
                if (pb !== pa) return pb - pa
                return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
            })

        // Если есть вопрос — отбираем релевантные по тегам, иначе берём по приоритету
        let selected = entries
        if (question) {
            const relevant = entries.filter(e =>
                e.tags?.some(t => questionLower.includes(t.toLowerCase())) ||
                contentToString(e.content).toLowerCase().split(/\s+/).some(w =>
                    w.length > 3 && questionLower.includes(w)
                )
            )
            selected = relevant.length > 0 ? relevant : entries
        }

        selected = selected.slice(0, limit)

        const lines = selected.map(e => {
            const prefix = `[${e.level.replace('_', ' ')}]`
            return `${prefix} ${contentToString(e.content)}`
        })

        return lines.length
            ? `Память OMEGA (контекст пользователя):\n${lines.join('\n')}`
            : ''
    } catch (err) {
        console.warn('[omegaMemory] getMemoryContext failed:', err.message)
        return ''
    }
}

/**
 * Сохранить фрагмент в память.
 */
export async function saveMemory(userId, level, content, tags = [], weight = 1) {
    if (!userId || !MEMORY_LAYERS.includes(level)) return null

    try {
        const entry = {
            level,
            content,
            tags: tags || [],
            weight,
            accessCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const doc = await OmegaMemory.findOneAndUpdate(
            { ownerId: userId },
            { $push: { entries: entry } },
            { upsert: true, new: true }
        )

        // [v9.9.19.14] write-through в 12-слойную память (глобальный мозг OMEGA)
        import('../../services/memoryLayerService.js')
            .then(m => m.addMemoryEntry(level, { type: 'fact', content, tags }))
            .catch(() => {})

        return doc
    } catch (err) {
        console.warn('[omegaMemory] saveMemory failed:', err.message)
        return null
    }
}

/**
 * Увеличить accessCount у записи (не используется в текущей схеме, но пригодится для ранжирования).
 */
export async function touchMemoryEntry(userId, entryId) {
    if (!userId || !entryId) return null
    try {
        return await OmegaMemory.findOneAndUpdate(
            { ownerId: userId, 'entries._id': entryId },
            { $inc: { 'entries.$.accessCount': 1 }, $set: { 'entries.$.lastAccessedAt': new Date() } },
            { new: true }
        ).lean()
    } catch (err) {
        console.warn('[omegaMemory] touchMemoryEntry failed:', err.message)
        return null
    }
}

/**
 * Простая эвристика извлечения фактов из сообщения пользователя.
 */
export function extractFactsFromQuestion(question) {
    if (!question || typeof question !== 'string') return []
    const lower = question.toLowerCase().replace(/[^а-яa-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim()
    const facts = []

    // Русский
    const iAmMatch = lower.match(/(?:я\s+(?:владею|работаю|делаю|занимаюсь|предлагаю|продаю|создаю|веду)\s+)([^.!,?]+)/)
    if (iAmMatch) {
        facts.push({ level: 'semantic', content: `Пользователь занимается: ${iAmMatch[1].trim()}`, tags: ['niche', 'business'] })
    }

    const nicheMatch = lower.match(/(?:моя?\s+ниша?|ниша?\s+(?:—|-|:|\s))\s*([^.!,?]+)/) ||
        lower.match(/(?:в\s+нише|ниша?)\s+([^.!,?]+)/)
    if (nicheMatch) {
        facts.push({ level: 'semantic', content: `Ниша пользователя: ${nicheMatch[1].trim()}`, tags: ['niche'] })
    }

    const nameMatch = lower.match(/(?:меня\s+зовут|я\s+—|я\s+)([а-яё]{2,30})/)
    if (nameMatch) {
        facts.push({ level: 'owner_profile', content: `Имя пользователя: ${nameMatch[1].trim()}`, tags: ['name'] })
    }

    const callMeMatch = lower.match(/(?:называй\s+меня|зови\s+меня)\s+([^.!,?]+)/)
    if (callMeMatch) {
        facts.push({ level: 'owner_profile', content: `Предпочтительное обращение: ${callMeMatch[1].trim()}`, tags: ['name'] })
    }

    const styleMatch = lower.match(/(?:стиль\s+общения|говори\s+)([^.!,?]+)/)
    if (styleMatch) {
        facts.push({ level: 'procedural', content: `Стиль общения: ${styleMatch[1].trim()}`, tags: ['style'] })
    }

    // English fallbacks
    const iAmEn = lower.match(/(?:i\s+(?:own|run|work\s+on|do|am|manage|lead|create)\s+)([^.!,?]+)/)
    if (iAmEn && !iAmMatch) {
        facts.push({ level: 'semantic', content: `User's business: ${iAmEn[1].trim()}`, tags: ['niche', 'business'] })
    }
    const nicheEn = lower.match(/(?:my\s+niche|niche\s+(?:is|—|-|:))\s*([^.!,?]+)/)
    if (nicheEn) {
        facts.push({ level: 'semantic', content: `User niche: ${nicheEn[1].trim()}`, tags: ['niche'] })
    }
    const nameEn = lower.match(/(?:my\s+name\s+is|i\s+am)\s+([a-z]{2,30})/)
    if (nameEn) {
        facts.push({ level: 'owner_profile', content: `User name: ${nameEn[1].trim()}`, tags: ['name'] })
    }

    return facts
}

/**
 * Извлечь и сохранить факты из вопроса.
 */
export async function extractAndSaveFacts(userId, question) {
    if (!userId || !question) return []
    const facts = extractFactsFromQuestion(question)
    if (!facts.length) return []

    const saved = []
    for (const fact of facts) {
        const doc = await saveMemory(userId, fact.level, fact.content, fact.tags, 2)
        if (doc) saved.push(fact)
    }
    if (saved.length) {
        console.log(`[omegaMemory] extracted ${saved.length} fact(s) for ${userId}`)
    }
    return saved
}

export default {
    MEMORY_LAYERS,
    getMemoryContext,
    saveMemory,
    touchMemoryEntry,
    extractAndSaveFacts,
}
