import cron from 'node-cron'
import { OfflineQueue } from '../models/OfflineQueue.js'

const BASE_URL = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`

let lastHealthCheck = Date.now()
let lastBackendOk = Date.now()
let isBackendHealthy = true
let isMongoConnected = true
let paymentGatewayStatus = { stripe: true, yookassa: true }

export async function checkServiceHealth() {
    try {
        const start = Date.now()
        const res = await fetch(`${BASE_URL}/api/health`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        })
        const ok = res.ok
        lastHealthCheck = Date.now()
        if (ok) {
            isBackendHealthy = true
            lastBackendOk = Date.now()
        } else {
            isBackendHealthy = false
        }
        return { healthy: ok, elapsed: Date.now() - start }
    } catch (error) {
        isBackendHealthy = false
        lastHealthCheck = Date.now()
        return { healthy: false, error: error.message }
    }
}

export function isBackendAvailable() {
    if (!isBackendHealthy) return false
    return Date.now() - lastBackendOk < 60000
}

export function isOfflineMode() {
    return !isBackendAvailable() && Date.now() - lastBackendOk > 60000
}

export function setMongoConnected(connected) {
    isMongoConnected = connected
}

export function isMongoAvailable() {
    return isMongoConnected
}

export function setPaymentGatewayStatus(gateway, available) {
    paymentGatewayStatus[gateway] = available
}

export function isPaymentGatewayAvailable(gateway) {
    return paymentGatewayStatus[gateway] !== false
}

export function getFailoverStatus() {
    let message = 'OK'
    if (!isBackendAvailable()) {
        message = 'OMEGA на техническом обслуживании. Ваши данные сохранены. Ожидайте 2-3 минуты.'
    } else if (!isMongoAvailable()) {
        message = 'OMEGA на техническом обслуживании. Ваши данные сохранены. Ожидайте 2-3 минуты.'
    } else if (!isPaymentGatewayAvailable('stripe') && !isPaymentGatewayAvailable('yookassa')) {
        message = 'Оплата временно недоступна. Попробуйте через 10 минут.'
    }
    return {
        backendHealthy: isBackendAvailable(),
        mongoConnected: isMongoAvailable(),
        offlineMode: isOfflineMode(),
        paymentGateways: paymentGatewayStatus,
        lastHealthCheck,
        message,
    }
}

export async function queueWriteOnMongoUnavailable(userId, action, data, endpoint, method = 'POST') {
    if (isMongoAvailable()) return { queued: false }
    try {
        const item = await OfflineQueue.create({ userId, action, data, endpoint, method, status: 'pending' })
        return { queued: true, id: item._id }
    } catch (err) {
        console.error('[failoverService] queueWriteOnMongoUnavailable failed:', err.message)
        return { queued: false, error: err.message }
    }
}

export function startFailoverCron() {
    if (!cron.validate('*/30 * * * * *')) return
    cron.schedule('*/30 * * * * *', () => {
        checkServiceHealth().catch(e => console.error('[failoverService] health check failed:', e.message))
    })
    console.log('[failoverService] health ping cron scheduled every 30s')
}
