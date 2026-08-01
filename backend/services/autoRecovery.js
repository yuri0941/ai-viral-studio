import { getProviderStatuses, toggleProviderSetting } from './aiService.js'
import { isConnected } from '../config/database.js'
import { alertOwner } from './ownerBot.js'
import { AuditLog } from '../models/index.js'

const RECOVERY_LOG = []
const MAX_LOG = 200

export function logRecovery({ action, problem, status, details = {}, ownerId = null }) {
    const entry = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        action,
        problem,
        status,
        details,
        ownerId,
        timestamp: new Date().toISOString(),
    }
    RECOVERY_LOG.unshift(entry)
    if (RECOVERY_LOG.length > MAX_LOG) RECOVERY_LOG.pop()

    AuditLog.create({
        action: `Self-healing: ${action}`,
        user: 'system',
        userId: ownerId,
        ownerId,
        type: 'system',
        severity: status === 'success' ? 'low' : (status === 'warning' ? 'medium' : 'high'),
        metadata: { ...details, autonomous: true, problem, status },
    }).catch(() => {})

    return entry
}

export async function getRecentLogs(limit = 50) {
    return RECOVERY_LOG.slice(0, limit)
}

export async function switchAIProvider(preferred = 'openrouter') {
    try {
        const statuses = await getProviderStatuses()
        const currentActive = statuses.find(s => s.enabled && s.status === 'active')
        if (currentActive && currentActive.id !== preferred) {
            await toggleProviderSetting(currentActive.id, false)
            logRecovery({ action: `disable provider ${currentActive.id}`, problem: 'AI provider failing', status: 'success' })
        }
        await toggleProviderSetting(preferred, true)
        await alertOwner(`🛠 Self-Healing: переключил AI-провайдер на ${preferred} из-за ошибок.`).catch(() => {})
        return logRecovery({ action: `enable provider ${preferred}`, problem: 'AI provider failing', status: 'success' })
    } catch (err) {
        return logRecovery({ action: 'switchAIProvider', problem: 'AI provider failing', status: 'error', details: { error: err.message } })
    }
}

export async function enableMockMode() {
    try {
        process.env.MOCK_DB_MODE = 'true'
        await alertOwner('🛠 Self-Healing: MongoDB недоступна. Включён MOCK-режим (данные не теряются, работаем из локального fallback).').catch(() => {})
        return logRecovery({ action: 'enable MOCK_DB_MODE', problem: 'MongoDB unavailable', status: 'success' })
    } catch (err) {
        return logRecovery({ action: 'enableMockMode', problem: 'MongoDB unavailable', status: 'error', details: { error: err.message } })
    }
}

export async function alertResource(type, value, threshold) {
    const message = `⚠️ Self-Healing: ${type} ${value}% превышает порог ${threshold}%. Требуется действие владельца.`
    await alertOwner(message).catch(() => {})
    return logRecovery({ action: 'resource alert', problem: `${type} high`, status: 'warning', details: { type, value, threshold } })
}

export async function requestRestart(reason) {
    const message = `🚨 Self-Healing: ${reason}. Рекомендуется рестарт в Render Dashboard (включён auto-heal, но Render не разрешает рестарт без owner).`
    await alertOwner(message).catch(() => {})
    return logRecovery({ action: 'request restart', problem: reason, status: 'warning' })
}

export function isMockMode() {
    return process.env.MOCK_DB_MODE === 'true'
}

export function checkDatabase() {
    return isConnected
}

export default {
    logRecovery,
    getRecentLogs,
    switchAIProvider,
    enableMockMode,
    alertResource,
    requestRestart,
    checkDatabase,
    isMockMode,
}
