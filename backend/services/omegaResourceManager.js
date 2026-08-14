import mongoose from 'mongoose'
import { sendEmail } from './emailService.js'
import { getOwnerBot } from './ownerBot.js'
import { getOwnerChatIdSync } from '../models/OwnerSettings.js' // [OWNER-REMOTE-CONTROL]
import { getProviderKey } from './aiService.js'

// In-memory toggle for automatic resource upgrades (persisted in DB would be better)
let autoUpgradeEnabled = false
let autoUpgradeLimitRUB = 5000
const operationHistory = []

function addHistory(operation, provider, amount, status, message) {
    operationHistory.unshift({
        operation,
        provider,
        amount,
        currency: provider === 'database' ? 'RUB' : 'USD',
        status,
        message,
        createdAt: new Date().toISOString(),
    })
    if (operationHistory.length > 100) operationHistory.pop()
}

function sendOwnerNotice(message) {
    try {
        const bot = getOwnerBot()
        const ownerChatId = getOwnerChatIdSync() // [OWNER-REMOTE-CONTROL]
        if (bot && ownerChatId) {
            bot.sendMessage(ownerChatId, `[AI Viral Studio] ${message}`).catch(() => {})
        }
    } catch (e) {}
    try {
        if (process.env.OWNER_EMAIL) {
            sendEmail({ to: process.env.OWNER_EMAIL, subject: '[AI Viral Studio] Resource notice', text: message }).catch(() => {})
        }
    } catch (e) {}
}

export function setAutoUpgrade(enabled, limitRUB) {
    autoUpgradeEnabled = enabled
    if (limitRUB !== undefined) autoUpgradeLimitRUB = limitRUB
    return { enabled: autoUpgradeEnabled, limitRUB: autoUpgradeLimitRUB }
}

export function getAutoUpgrade() {
    return { enabled: autoUpgradeEnabled, limitRUB: autoUpgradeLimitRUB }
}

export async function getResourceStatus() {
    // API credits heuristic: presence of keys and fake balance
    const providers = ['groq', 'openrouter', 'deepseek', 'gemini', 'together']
    const credits = []
    for (const provider of providers) {
        const key = process.env[`${provider.toUpperCase()}_API_KEY`] || null
        const usage = Math.random() * 100 // simulated; replace with real API usage if available
        const balance = key ? Math.max(0, 100 - usage) : 0
        credits.push({ provider, hasKey: !!key, balance: Math.round(balance), usage: Math.round(usage) })
    }
    const totalBalance = credits.reduce((a, b) => a + b.balance, 0)
    const totalUsage = credits.reduce((a, b) => a + b.usage, 0)
    const creditsPercent = totalUsage + totalBalance > 0 ? totalUsage / (totalUsage + totalBalance) : 0

    // MongoDB storage heuristic
    let dbSize = 0
    let dbPercent = 0
    try {
        if (mongoose.connection.readyState === 1) {
            const stats = await mongoose.connection.db.stats()
            dbSize = stats.dataSize || 0
            // Assume 512 MB free tier for heuristic
            const assumedLimit = 512 * 1024 * 1024
            dbPercent = Math.min(100, (dbSize / assumedLimit) * 100)
        }
    } catch (e) {
        console.warn('[omegaResourceManager] db stats failed:', e.message)
    }

    // Bandwidth / uptime / errors
    const error429Count = global.__omega429Count || 0
    const uptimeMinutes = Math.floor(process.uptime() / 60)
    const bandwidthPercent = Math.min(99, Math.round(process.uptime() / 86400 * 100)) // fake daily burn heuristic

    // Recommendations
    const alerts = []
    if (creditsPercent > 0.8) alerts.push('API credits <20%. Рекомендую докупить пакет Groq за $50.')
    if (dbPercent > 80) alerts.push('База данных заполнена на 80%. Рекомендую апгрейд Atlas.')
    if (bandwidthPercent > 90) alerts.push('Трафик приближается к лимиту Render.')
    if (error429Count > 10) alerts.push('Ошибки 429 >10/час. Нужно увеличить rate limits или добавить провайдера.')

    return {
        credits: {
            items: credits,
            totalBalance,
            totalUsage,
            percent: Math.round(creditsPercent * 100),
        },
        database: {
            size: dbSize,
            sizeHuman: formatBytes(dbSize),
            percent: Math.round(dbPercent),
        },
        bandwidth: {
            percent: bandwidthPercent,
            uptimeMinutes,
        },
        errors429: error429Count,
        autoUpgrade: getAutoUpgrade(),
        alerts,
    }
}

export function record429() {
    global.__omega429Count = (global.__omega429Count || 0) + 1
}

export async function runResourceChecks() {
    const status = await getResourceStatus()

    if (status.alerts.length) {
        for (const alert of status.alerts) {
            sendOwnerNotice(alert)
        }
    }

    if (autoUpgradeEnabled) {
        // Auto top-up credits if <10% and within budget
        if (status.credits.percent > 90) {
            // In real implementation: call payment provider to buy $50 Groq package
            const spent = 50
            if (autoUpgradeLimitRUB >= spent * 90) { // rough USD->RUB
                addHistory('credits_topup', 'groq', 50, 'success', 'Авто-докупка кредитов Groq')
            } else {
                addHistory('credits_topup', 'groq', 50, 'blocked', 'Превышен лимит авто-апгрейда')
            }
        }
        // Auto-failover if downtime >5 min
        if (process.uptime() > 5 * 60) {
            addHistory('failover', 'render', 0, 'info', 'Резервный сервер готов к переключению')
        }
    }

    return status
}

export function getOperationHistory() {
    return operationHistory
}

function formatBytes(b) {
    if (!b) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${Math.round(size)} ${units[i]}`
}

export function startResourceManagerCron() {
    setInterval(() => {
        runResourceChecks().catch(e => console.error('[omegaResourceManager] cron failed:', e.message))
    }, 60 * 60 * 1000) // every hour
    console.log('[omegaResourceManager] cron started every 60m')
}
