import cron from 'node-cron'

let lastHealthCheck = Date.now()
let isBackendHealthy = true
let isMongoConnected = true

export async function checkServiceHealth() {
    try {
        // Basic self health check: ensure event loop is responsive
        const start = Date.now()
        await new Promise(resolve => setTimeout(resolve, 10))
        const elapsed = Date.now() - start
        isBackendHealthy = elapsed < 1000
        lastHealthCheck = Date.now()
        return { healthy: isBackendHealthy, elapsed }
    } catch (e) {
        isBackendHealthy = false
        return { healthy: false, error: e.message }
    }
}

export function isBackendAvailable() {
    if (!isBackendHealthy) return false
    return Date.now() - lastHealthCheck < 60000
}

export function setMongoConnected(connected) {
    isMongoConnected = connected
}

export function isMongoAvailable() {
    return isMongoConnected
}

export function getFailoverStatus() {
    return {
        backendHealthy: isBackendAvailable(),
        mongoConnected: isMongoAvailable(),
        lastHealthCheck,
        message: isBackendAvailable()
            ? (isMongoAvailable() ? 'OK' : 'OMEGA на техническом обслуживании. Ваши данные сохранены.')
            : 'OMEGA на техническом обслуживании. Ваши данные сохранены.',
    }
}

export function startFailoverCron() {
    if (!cron.validate('*/30 * * * * *')) return
    cron.schedule('*/30 * * * * *', () => {
        checkServiceHealth().catch(e => console.error('[failoverService] health check failed:', e.message))
    })
    console.log('[failoverService] health ping cron scheduled every 30s')
}
