// [MEMORY-FIX] Единый лог памяти процесса: периодический снапшот (5 мин) +
// точечные замеры на тяжёлых операциях (vision-разбор, бэкап, генерация, загрузка медиа).
// Render Free = 512MB — нужен факт, где растёт RSS.

const toMB = (bytes) => Math.round(bytes / 1024 / 1024)

export function snapshotMemory() {
    const m = process.memoryUsage()
    return { rssMB: toMB(m.rss), heapUsedMB: toMB(m.heapUsed), heapTotalMB: toMB(m.heapTotal), externalMB: toMB(m.external) }
}

export function logMemory(tag = 'tick') {
    const s = snapshotMemory()
    console.log(`[MEM] ${tag} rss=${s.rssMB}MB heap=${s.heapUsedMB}/${s.heapTotalMB}MB ext=${s.externalMB}MB`)
    return s
}

export function startMemoryLogger(intervalMs = 5 * 60 * 1000) {
    logMemory('boot')
    const timer = setInterval(() => logMemory('interval'), intervalMs)
    timer.unref?.()
    return timer
}
