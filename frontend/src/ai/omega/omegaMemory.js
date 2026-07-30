// ============================================
// OMEGA Memory — 8-уровневая память AI-системы
// Версия: 1.0 Lite (фундамент для OMEGA v5)
// ============================================

/**
 * Уровни памяти OMEGA.
 */
export const MEMORY_LEVELS = {
    SHORT_TERM: 'short_term',       // Текущий диалог, контекст последних сообщений
    WORKING: 'working',             // Активные задачи и промежуточные вычисления
    LONG_TERM: 'long_term',         // Важные факты, сохранённые вручную или авто
    SEMANTIC: 'semantic',           // Знания о предметной области
    PROCEDURAL: 'procedural',       // Инструкции, шаблоны, скрипты
    EPISODIC: 'episodic',           // События, кейсы, истории взаимодействий
    OWNER_PROFILE: 'owner_profile', // Профиль владельца: предпочтения, цели, ограничения
    EMOTIONAL: 'emotional',         // Эмоциональная память: реакции, trust level
}

const STORAGE_KEY = 'omega_memory_v1'
const DEFAULT_LIMITS = {
    [MEMORY_LEVELS.SHORT_TERM]: 50,
    [MEMORY_LEVELS.WORKING]: 100,
    [MEMORY_LEVELS.LONG_TERM]: 500,
    [MEMORY_LEVELS.SEMANTIC]: 1000,
    [MEMORY_LEVELS.PROCEDURAL]: 300,
    [MEMORY_LEVELS.EPISODIC]: 400,
    [MEMORY_LEVELS.OWNER_PROFILE]: 100,
    [MEMORY_LEVELS.EMOTIONAL]: 200,
}

/**
 * OmegaMemory — универсальное хранилище 8-уровневой памяти.
 */
export class OmegaMemory {
    constructor(options = {}) {
        this.levels = Object.fromEntries(
            Object.values(MEMORY_LEVELS).map(level => [level, []])
        )
        this.limits = { ...DEFAULT_LIMITS, ...options.limits }
        this.persistence = options.persistence !== false
        this.ownerId = options.ownerId || 'default'
        if (this.persistence) {
            this.load()
        }
    }

    /**
     * Возвращает ключ для localStorage с учётом владельца.
     */
    getStorageKey() {
        return `${STORAGE_KEY}_${this.ownerId}`
    }

    /**
     * Сохраняет запись в указанный уровень памяти.
     */
    store(level, data, options = {}) {
        if (!this.levels[level]) {
            throw new Error(`Unknown memory level: ${level}`)
        }

        const entry = {
            id: data.id || this.generateId(),
            level,
            content: data.content ?? data,
            tags: data.tags || [],
            weight: data.weight ?? 1,
            createdAt: data.createdAt || new Date().toISOString(),
            accessCount: 0,
            lastAccessed: new Date().toISOString(),
            expiresAt: options.ttl ? new Date(Date.now() + options.ttl).toISOString() : null,
        }

        // Для short_term заменяем старые записи по FIFO.
        if (level === MEMORY_LEVELS.SHORT_TERM) {
            this.levels[level].push(entry)
            while (this.levels[level].length > this.limits[level]) {
                this.levels[level].shift()
            }
        } else {
            // Обновляем существующую запись по id, если есть.
            const idx = this.levels[level].findIndex(e => e.id === entry.id)
            if (idx >= 0) {
                this.levels[level][idx] = { ...this.levels[level][idx], ...entry, updatedAt: new Date().toISOString() }
            } else {
                this.levels[level].push(entry)
                this.enforceLimit(level)
            }
        }

        this.persist()
        return entry
    }

    /**
     * Поиск релевантных записей по запросу (простой keyword/теговый поиск).
     */
    recall(query, limit = 5, levels = null) {
        const targetLevels = levels || Object.values(MEMORY_LEVELS)
        const queryLower = (query || '').toLowerCase()
        const terms = queryLower.split(/\s+/).filter(Boolean)

        const scored = []
        for (const level of targetLevels) {
            for (const entry of this.levels[level] || []) {
                if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) continue

                let score = 0
                const content = typeof entry.content === 'string' ? entry.content.toLowerCase() : JSON.stringify(entry.content).toLowerCase()

                // Score by keyword matches
                for (const term of terms) {
                    if (content.includes(term)) score += 1
                    for (const tag of entry.tags) {
                        if (tag.toLowerCase().includes(term)) score += 2
                    }
                }

                // Weight boost
                score *= entry.weight || 1

                // Recency boost
                const ageHours = (Date.now() - new Date(entry.createdAt).getTime()) / 3600000
                score *= Math.max(0.1, 1 - ageHours / 168) // Уменьшается за неделю

                if (score > 0) {
                    scored.push({ entry, score })
                    entry.accessCount++
                    entry.lastAccessed = new Date().toISOString()
                }
            }
        }

        scored.sort((a, b) => b.score - a.score)
        this.persist()
        return scored.slice(0, limit).map(s => s.entry)
    }

    /**
     * Возвращает все записи уровня.
     */
    getLevel(level, options = {}) {
        let entries = [...(this.levels[level] || [])]
        if (!options.includeExpired) {
            entries = entries.filter(e => !e.expiresAt || new Date(e.expiresAt) >= new Date())
        }
        return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    /**
     * Удаляет запись по ID.
     */
    forget(level, id) {
        if (!this.levels[level]) return false
        const before = this.levels[level].length
        this.levels[level] = this.levels[level].filter(e => e.id !== id)
        this.persist()
        return this.levels[level].length < before
    }

    /**
     * Очищает весь уровень памяти.
     */
    clear(level) {
        if (!this.levels[level]) return false
        this.levels[level] = []
        this.persist()
        return true
    }

    /**
     * Переносит запись из одного уровня в другой.
     */
    promote(entryId, fromLevel, toLevel, options = {}) {
        const entry = this.levels[fromLevel]?.find(e => e.id === entryId)
        if (!entry) return null
        this.forget(fromLevel, entryId)
        return this.store(toLevel, { ...entry, weight: (entry.weight || 1) + 0.5 }, options)
    }

    /**
     * Сводка по всем уровням памяти.
     */
    getSummary() {
        return Object.fromEntries(
            Object.entries(this.levels).map(([level, entries]) => [
                level,
                {
                    count: entries.length,
                    limit: this.limits[level],
                    recent: entries.slice(-3).map(e => ({
                        id: e.id,
                        preview: typeof e.content === 'string' ? e.content.slice(0, 60) : '[object]',
                        createdAt: e.createdAt,
                    })),
                },
            ])
        )
    }

    /**
     * Сохраняет память в localStorage.
     */
    persist() {
        if (!this.persistence) return
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(this.levels))
        } catch (e) {
            console.warn('[OmegaMemory] Failed to persist:', e)
        }
    }

    /**
     * Загружает память из localStorage.
     */
    load() {
        try {
            const saved = localStorage.getItem(this.getStorageKey())
            if (saved) {
                const parsed = JSON.parse(saved)
                for (const level of Object.values(MEMORY_LEVELS)) {
                    this.levels[level] = Array.isArray(parsed[level]) ? parsed[level] : []
                }
            }
        } catch (e) {
            console.warn('[OmegaMemory] Failed to load:', e)
        }
    }

    /**
     * Экспорт всех данных памяти.
     */
    export() {
        return JSON.stringify(this.levels, null, 2)
    }

    /**
     * Импорт данных памяти.
     */
    import(json) {
        try {
            const parsed = typeof json === 'string' ? JSON.parse(json) : json
            for (const level of Object.values(MEMORY_LEVELS)) {
                this.levels[level] = Array.isArray(parsed[level]) ? parsed[level] : []
                this.enforceLimit(level)
            }
            this.persist()
        } catch (e) {
            console.warn('[OmegaMemory] Failed to import:', e)
        }
    }

    enforceLimit(level) {
        const limit = this.limits[level]
        if (!limit) return
        while (this.levels[level].length > limit) {
            // Удаляем запись с наименьшим весом и старейшую
            this.levels[level].sort((a, b) => {
                const scoreA = (a.weight || 1) / (Date.now() - new Date(a.createdAt).getTime() + 1)
                const scoreB = (b.weight || 1) / (Date.now() - new Date(b.createdAt).getTime() + 1)
                return scoreA - scoreB
            })
            this.levels[level].shift()
        }
    }

    generateId() {
        return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    }
}

export default OmegaMemory
