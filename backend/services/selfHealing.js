import cron from 'node-cron'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { getProviderStatuses, chatWithAI } from './aiService.js'
import {
    logRecovery,
    getRecentLogs,
    switchAIProvider,
    enableMockMode,
    alertResource,
    requestRestart,
    checkDatabase,
    isMockMode,
} from './autoRecovery.js'
import { createNode } from './cognitiveMesh.js'
import { alertOwner } from './ownerBot.js'
import { alertOmega } from './omegaBot.js'
import { OwnerSettings } from '../models/index.js'

let healingJob = null
let consecutiveHealthErrors = 0
const MAX_HEALTH_ERRORS = 2

const AI_ERROR_HISTORY = new Map()
const AI_PROVIDER_ORDER = ['groq', 'openrouter', 'gemini', 'deepseek', 'mistral']

const BASE_URL = process.env.SELF_HEALING_BASE_URL || `http://localhost:${process.env.PORT || 10000}`

async function checkHealthEndpoint() {
    try {
        const res = await axios.get(`${BASE_URL}/health`, { timeout: 10000 })
        if (res.status === 200 && res.data?.status === 'ok') {
            consecutiveHealthErrors = 0
            return { ok: true }
        }
        throw new Error(`Unexpected status ${res.status}`)
    } catch (err) {
        consecutiveHealthErrors++
        return { ok: false, error: err.message, consecutive: consecutiveHealthErrors }
    }
}

async function checkAIProviders() {
    const statuses = await getProviderStatuses()
    const active = statuses.find(s => s.enabled && s.status === 'active')
    const healthy = statuses.filter(s => s.status === 'active' && s.hasKey)

    if (!active && healthy.length > 0) {
        await switchAIProvider(healthy[0].id)
        alertOmega(`Self-Healing: активирован fallback-провайдер ${healthy[0].id}`).catch(() => {})
        return logRecovery({ action: `activate fallback ${healthy[0].id}`, problem: 'No active AI provider', status: 'success' })
    }

    if (active && active.status !== 'active') {
        const next = AI_PROVIDER_ORDER.find(id => id !== active.id && healthy.some(h => h.id === id)) || healthy[0]?.id
        if (next) {
            AI_ERROR_HISTORY.set(active.id, (AI_ERROR_HISTORY.get(active.id) || 0) + 1)
            if (AI_ERROR_HISTORY.get(active.id) >= 2) {
                await switchAIProvider(next)
                alertOmega(`Self-Healing: переключение AI-провайдера ${active.id} → ${next}`).catch(() => {})
                return logRecovery({ action: `switch provider ${active.id} -> ${next}`, problem: 'AI provider failing 2+ times', status: 'success' })
            }
            return logRecovery({ action: `detect ${active.id} error`, problem: 'AI provider error', status: 'warning', details: { provider: active.id } })
        }
    }

    return null
}

async function checkDatabaseConnection() {
    if (checkDatabase()) return { ok: true }
    if (isMockMode()) return { ok: true, mock: true }
    await enableMockMode()
    return { ok: false, mock: true }
}

async function checkDiskAndMemory() {
    const results = {}
    try {
        if (process.platform !== 'win32') {
            const { stdout: disk } = await import('child_process').then(cp => cp.promises.exec("df / | tail -1 | awk '{print $5}' | sed 's/%//'"))
            const diskValue = parseInt(disk.trim(), 10)
            if (!isNaN(diskValue) && diskValue > 90) {
                results.disk = { value: diskValue, threshold: 90, alert: true }
                await alertResource('disk', diskValue, 90)
            }
        }
    } catch (err) {
        // ignore disk check errors
    }

    const memoryMB = process.memoryUsage().rss / 1024 / 1024
    if (memoryMB > 500) {
        results.memory = { value: Math.round(memoryMB), threshold: 500, alert: true }
        await alertResource('memory', Math.round(memoryMB), 500)
    }

    return results
}

async function loadOwnerSettings() {
    try {
        const all = await OwnerSettings.find({}).lean()
        return all.map(s => ({ ownerId: s.ownerId, autoHeal: s.features?.autoHeal ?? true }))
    } catch (err) {
        return []
    }
}

async function runHealingTick() {
    const owners = await loadOwnerSettings()
    const autoHealEnabled = owners.length === 0 ? true : owners.some(o => o.autoHeal)

    const health = await checkHealthEndpoint()
    if (!health.ok) {
        logRecovery({ action: 'health check failed', problem: 'server health', status: 'warning', details: health })
        if (health.consecutive >= MAX_HEALTH_ERRORS) {
            await alertOwner('🚨 Self-Healing: сервер не отвечает на health check. Возможно, требуется перезапуск в Render.').catch(() => {})
            alertOmega('Self-Healing: сервер не отвечает на health check, запрошен перезапуск.').catch(() => {})
            if (autoHealEnabled) {
                await requestRestart('health check failed 2+ times')
            }
        }
    }

    const aiResult = await checkAIProviders()
    if (!aiResult) {
        // all good
    }

    await checkDatabaseConnection()

    await checkDiskAndMemory()
}

export function startSelfHealing() {
    if (healingJob) return
    healingJob = cron.schedule('*/5 * * * *', runHealingTick)
    console.log('[selfHealing] cron started (every 5 min)')
}

export function stopSelfHealing() {
    if (healingJob) {
        healingJob.stop()
        healingJob = null
    }
}

export async function getSelfHealingStatus() {
    const statuses = await getProviderStatuses().catch(() => [])
    const logs = await getRecentLogs(20)
    return {
        healthy: consecutiveHealthErrors < MAX_HEALTH_ERRORS,
        consecutiveHealthErrors,
        databaseConnected: checkDatabase(),
        mockMode: isMockMode(),
        providers: statuses,
        logs,
    }
}

export async function toggleAutoHeal(ownerId, enabled) {
    await OwnerSettings.findOneAndUpdate(
        { ownerId },
        { $set: { 'features.autoHeal': !!enabled } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return { ownerId, autoHeal: !!enabled }
}

export async function getPreferredProvider() {
    try {
        const statuses = await getProviderStatuses()
        const active = statuses.find(s => s.enabled && s.status === 'active')
        if (active) return active.id
        const fallback = statuses.find(s => s.hasKey && s.status !== 'disabled')
        if (fallback) return fallback.id
        return AI_PROVIDER_ORDER[0] || 'groq'
    } catch (err) {
        return AI_PROVIDER_ORDER[0] || 'groq'
    }
}

export default { startSelfHealing, stopSelfHealing, getSelfHealingStatus, toggleAutoHeal, runHealingTick, getPreferredProvider }

// === v9.6 SELF-OPTIMIZE additions ===
const ERROR_LOG = []
export function recordError(error, context = {}) {
  ERROR_LOG.push({ timestamp: new Date(), message: error.message, stack: error.stack?.slice(0, 500), status: error.status, path: context.path, file: context.file })
  if (ERROR_LOG.length > 100) ERROR_LOG.shift()
}

export async function analyzeErrors(ownerId) {
  const recent = ERROR_LOG.slice(-20)
  if (recent.length === 0) return { issues: [], score: 100 }
  const prompt = `Analyze these errors and suggest fixes. Errors: ${JSON.stringify(recent.map(e => ({ message: e.message, status: e.status, path: e.path })))}. Return JSON: { issues: [{file, line, problem, fix, confidence}], score: 0-100 }`
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.3 })
  let analysis
  try { analysis = JSON.parse(aiResult?.reply || aiResult?.text || '{}') } catch (e) { analysis = { issues: [], score: 100 } }
  await createNode({ type: 'system', content: `Self-healing analysis: ${analysis.issues?.length || 0} issues found`, confidence: 0.9, source: 'self_healing', metadata: { ownerId, issues: analysis.issues, score: analysis.score, type: 'healing_analysis' } })
  return analysis
}

export async function generateFix(issue, filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8')
    const prompt = `Fix this issue in the code. Issue: ${issue.problem}. File: ${filePath}. Code: ${code.slice(0, 3000)}. Return ONLY the fixed code block (complete file or relevant section).`
    const aiResult = await chatWithAI(prompt, [], 'ru', { maxTokens: 3000, temperature: 0.2 })
    return aiResult?.reply || aiResult?.text || null
  } catch (e) { return null }
}

