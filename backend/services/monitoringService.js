import os from 'os'
import mongoose from 'mongoose'
import { sendEmail } from './emailService.js'
import { getOwnerBot, sendOwnerAlert } from './ownerBot.js'

const MAX_HISTORY = 1440 // 24h at 1 sample/min
const metricsHistory = []
const errorBuckets = [] // { timestamp, count }
const latencyBuckets = [] // { timestamp, ms }

let lastAlertSent = {
    errorRate: 0,
    latency: 0,
    dbConnections: 0,
}

function now() { return Date.now() }

function pushAlert(type) {
    const cooldown = 30 * 60 * 1000
    if (now() - (lastAlertSent[type] || 0) < cooldown) return
    lastAlertSent[type] = now()
    const message = type === 'errorRate' ? '⚠️ Error rate >5% за последние 5 мин.'
        : type === 'latency' ? '⚠️ API response time >2 сек. Проверьте backend.'
            : '⚠️ MongoDB connections приближаются к лимиту.'
    // [OWNER-REMOTE-CONTROL] chat_id резолвится внутри sendOwnerAlert через getOwnerChatId()
    sendOwnerAlert(message, type === 'errorRate' ? 'warning' : type).catch(() => {})
    if (process.env.OWNER_EMAIL) {
        sendEmail({ to: process.env.OWNER_EMAIL, subject: '[AI Viral Studio] Monitoring alert', text: message }).catch(() => {})
    }
}

function pruneBuckets(buckets, windowMs) {
    const cutoff = now() - windowMs
    while (buckets.length && buckets[0].timestamp < cutoff) buckets.shift()
}

export function recordRequest(latencyMs, statusCode) {
    latencyBuckets.push({ timestamp: now(), ms: latencyMs })
    pruneBuckets(latencyBuckets, 60 * 60 * 1000)
    if (statusCode >= 400) {
        errorBuckets.push({ timestamp: now() })
        pruneBuckets(errorBuckets, 60 * 60 * 1000)
    }
}

export function getMetrics() {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpuLoad = os.loadavg()
    const mongoState = mongoose.connection.readyState

    // 5-min window
    pruneBuckets(latencyBuckets, 5 * 60 * 1000)
    pruneBuckets(errorBuckets, 5 * 60 * 1000)
    const recentLatency = latencyBuckets.slice(-100)
    const avgLatency = recentLatency.length
        ? recentLatency.reduce((a, b) => a + b.ms, 0) / recentLatency.length
        : 0

    const totalRecent = recentLatency.length
    const errorRecent = errorBuckets.length
    const errorRate = totalRecent > 0 ? errorRecent / totalRecent : 0

    return {
        cpu: {
            load1: cpuLoad[0],
            load5: cpuLoad[1],
            load15: cpuLoad[2],
            cores: os.cpus().length,
        },
        ram: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            percent: Math.round((usedMem / totalMem) * 100),
        },
        db: {
            ready: mongoState === 1,
            state: mongoState,
        },
        redis: {
            connected: false, // filled by redis client if available
        },
        apiLatency: Math.round(avgLatency),
        errorRate: Math.round(errorRate * 1000) / 1000,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }
}

export function runMonitoringCheck() {
    const m = getMetrics()
    metricsHistory.push({ ...m, timestamp: Date.now() })
    if (metricsHistory.length > MAX_HISTORY) metricsHistory.shift()

    if (m.errorRate > 0.05) pushAlert('errorRate')
    if (m.apiLatency > 2000) pushAlert('latency')
    // MongoDB connection limit heuristic not available via mongoose, skip dbConnections alert

    return m
}

export function getMetricsHistory() {
    return metricsHistory
}

export function startMonitoringCron() {
    setInterval(() => {
        try { runMonitoringCheck() } catch (e) { console.error('[monitoringService]', e.message) }
    }, 60 * 1000)
    console.log('[monitoringService] monitoring cron started every 60s')
}

export function monitoringMiddleware(req, res, next) {
    const start = Date.now()
    res.on('finish', () => {
        const latency = Date.now() - start
        recordRequest(latency, res.statusCode)
    })
    next()
}
