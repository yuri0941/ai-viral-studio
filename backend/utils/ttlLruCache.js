// [MEMORY-FIX] TTL + LRU-кэш с жёстким лимитом записей.
// Безразмерные Map на проде (Render Free 512MB) запрещены — все кэши через этот хелпер.
export class TtlLruCache {
    constructor({ ttlMs = 300_000, maxEntries = 500 } = {}) {
        this.ttlMs = ttlMs
        this.maxEntries = maxEntries
        this.map = new Map()
    }

    get(key) {
        const entry = this.map.get(key)
        if (!entry) return null
        if (Date.now() > entry.expiresAt) {
            this.map.delete(key)
            return null
        }
        // LRU: поднять в конец
        this.map.delete(key)
        this.map.set(key, entry)
        return entry.value
    }

    set(key, value, ttlMs = this.ttlMs) {
        this.map.delete(key)
        this.map.set(key, { value, expiresAt: Date.now() + ttlMs })
        // вытеснение самых старых сверх лимита
        while (this.map.size > this.maxEntries) {
            this.map.delete(this.map.keys().next().value)
        }
    }

    delete(key) { this.map.delete(key) }
    clear() { this.map.clear() }

    // удалить все протухшие записи (периодический sweep)
    sweep() {
        const now = Date.now()
        for (const [k, v] of this.map) {
            if (now > v.expiresAt) this.map.delete(k)
        }
    }

    get size() { return this.map.size }
}
