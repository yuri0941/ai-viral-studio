import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { chatWithAI } from '../../services/aiService.js'
import { AuditLog } from '../../models/AuditLog.js'
import Sandbox from './sandbox.js'
import { alertOmega } from '../../services/omegaBot.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../..')

/**
 * OMEGA Coder — autonomous code improvement module.
 * OMEGA may only edit files inside its own AI directories.
 * Critical systems (auth, users, server ports/CORS, env, payments) are off-limits.
 */

export const ALLOWED_PATHS = [
    path.join(PROJECT_ROOT, 'backend/ai/omega'),
    path.join(PROJECT_ROOT, 'frontend/src/ai/omega'),
]

export const FORBIDDEN_PATHS = [
    path.join(PROJECT_ROOT, 'backend/routes/auth.js'),
    path.join(PROJECT_ROOT, 'backend/models/User.js'),
    path.join(PROJECT_ROOT, 'backend/server.js'),
    path.join(PROJECT_ROOT, 'backend/routes/payments.js'),
    path.join(PROJECT_ROOT, 'backend/routes/yookassa.js'),
    path.join(PROJECT_ROOT, 'backend/routes/stripe.js'),
    path.join(PROJECT_ROOT, 'backend/routes/paypal.js'),
    path.join(PROJECT_ROOT, 'backend/.env'),
    path.join(PROJECT_ROOT, 'backend/config/env.js'),
]

export const approvalQueue = []

function isAllowedPath(filePath) {
    const normalized = path.normalize(filePath)
    if (FORBIDDEN_PATHS.some(forbidden => normalized.startsWith(path.normalize(forbidden)))) {
        return false
    }
    return ALLOWED_PATHS.some(allowed => normalized.startsWith(path.normalize(allowed)))
}

async function logAttempt(action, metadata = {}, severity = 'low') {
    try {
        await AuditLog.create({
            action: `omega_coder:${action}`,
            user: 'OMEGA',
            type: 'system',
            severity,
            metadata,
        })
    } catch (err) {
        console.warn('[OmegaCoder] AuditLog failed:', err.message)
    }
}

/**
 * Recursively list all .js/.jsx/.ts files in allowed directories.
 */
export async function scanAllowedFiles() {
    const files = []
    for (const root of ALLOWED_PATHS) {
        try {
            await scanDir(root, files)
        } catch (err) {
            console.warn('[OmegaCoder] scan failed for', root, err.message)
        }
    }
    return files
}

async function scanDir(dir, accumulator) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue
            await scanDir(fullPath, accumulator)
        } else if (/\.(js|jsx|ts)$/.test(entry.name)) {
            accumulator.push(fullPath)
        }
    }
}

/**
 * Ask OMEGA to analyze a file and propose a minimal optimization patch.
 */
export async function generatePatch(filePath, issueHint = '') {
    if (!isAllowedPath(filePath)) {
        await logAttempt('forbidden_path', { filePath }, 'high')
        throw new Error(`Forbidden path: ${filePath}`)
    }

    const code = await fs.readFile(filePath, 'utf8')
    const fileName = path.basename(filePath)

    const prompt = [
        'Ты — OMEGA Coder, автономный инженер AI Viral Studio.',
        'Твоя задача: проанализировать файл и предложить МИНИМАЛЬНЫЙ безопасный патч (оптимизация, рефакторинг или исправление мелкого дефекта).',
        'Правила:',
        '1. Изменяй только этот файл.',
        '2. НЕ меняй auth, users, payments, env, порты, CORS.',
        '3. НЕ добавляй новые зависимости.',
        '4. Сохрани существующий стиль и формат.',
        '5. Ответь ТОЛЬКО в формате JSON: { "description": "...", "patch": "полный новый код файла" }.',
        issueHint ? `Контекст проблемы: ${issueHint}` : '',
        `Файл: ${fileName}`,
        '---',
        code,
    ].filter(Boolean).join('\n')

    const ai = await chatWithAI(prompt, [], 'ru', { userId: 'omega' })
    const raw = ai?.reply || ai?.text || '{}'

    let parsed
    try {
        // Extract JSON if wrapped in markdown code fences
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw
        parsed = JSON.parse(jsonStr)
    } catch (err) {
        // [P16-HOTFIX] AI returned non-JSON: log and create a safe fallback patch
        await logAttempt('parse_failed', { filePath, raw: raw.slice(0, 200) }, 'medium')
        console.error('[OmegaCoder] AI returned non-JSON, using text fallback for', filePath)
        return {
            filePath,
            description: `AI suggestion (raw): ${raw.slice(0, 200).replace(/\n/g, ' ')}`,
            patch: `${code}\n\n// [P16-HOTFIX] AI suggested improvements (raw text):\n// ${raw.split('\n').join('\n// ')}`,
            generatedAt: new Date().toISOString(),
        }
    }

    if (!parsed.patch || typeof parsed.patch !== 'string') {
        throw new Error('AI patch missing "patch" field')
    }

    return {
        filePath,
        description: parsed.description || 'Оптимизация от OMEGA',
        patch: parsed.patch,
        generatedAt: new Date().toISOString(),
    }
}

/**
 * Validate a patch in the sandbox and, if it passes, submit to owner approval queue.
 */
export async function submitToApprovalQueue(patch) {
    if (!isAllowedPath(patch.filePath)) {
        await logAttempt('forbidden_patch_submit', { filePath: patch.filePath }, 'high')
        throw new Error('Forbidden patch path')
    }

    const sandbox = new Sandbox({ timeoutMs: 5000, memoryMb: 64 })
    const validation = await sandbox.validate(patch.patch, {
        filename: path.basename(patch.filePath),
    })

    if (!validation.success) {
        await logAttempt('patch_validation_failed', {
            filePath: patch.filePath,
            error: validation.error,
            stage: validation.stage,
        }, 'medium')
        throw new Error(`Patch validation failed at ${validation.stage}: ${validation.error}`)
    }

    const item = {
        id: `patch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ...patch,
        status: 'pending',
        submittedAt: new Date().toISOString(),
    }

    approvalQueue.push(item)
    await logAttempt('patch_submitted', { filePath: patch.filePath, patchId: item.id }, 'low')
    alertOmega(`Omega Coder: новый approval request — ${path.basename(patch.filePath)} (${item.id})`).catch(() => {})

    return item
}

/**
 * Owner approval: write the patch to disk and commit+push.
 */
export async function approvePatch(patchId) {
    const item = approvalQueue.find(p => p.id === patchId)
    if (!item) throw new Error('Patch not found')
    if (item.status !== 'pending') throw new Error(`Patch already ${item.status}`)

    if (!isAllowedPath(item.filePath)) {
        await logAttempt('forbidden_patch_approve', { filePath: item.filePath, patchId }, 'high')
        throw new Error('Forbidden patch path')
    }

    await fs.writeFile(item.filePath, item.patch, 'utf8')
    item.status = 'applied'
    item.appliedAt = new Date().toISOString()

    await logAttempt('patch_applied', { filePath: item.filePath, patchId }, 'medium')

    try {
        await execAsync(`git add "${item.filePath}" && git commit -m "feat(omega): ${item.description}" && git push origin main`, {
            cwd: PROJECT_ROOT,
        })
        item.pushedAt = new Date().toISOString()
        await logAttempt('patch_pushed', { filePath: item.filePath, patchId }, 'low')
    } catch (err) {
        await logAttempt('patch_push_failed', { filePath: item.filePath, patchId, error: err.message }, 'high')
        console.warn('[OmegaCoder] git push failed:', err.message)
    }

    return item
}

export function rejectPatch(patchId) {
    const item = approvalQueue.find(p => p.id === patchId)
    if (!item) throw new Error('Patch not found')
    item.status = 'rejected'
    item.rejectedAt = new Date().toISOString()
    return item
}

export function getApprovalQueue() {
    return approvalQueue.map(p => ({
        id: p.id,
        filePath: p.filePath,
        description: p.description,
        status: p.status,
        submittedAt: p.submittedAt,
    }))
}

/**
 * Daily autonomous analysis: scan files, generate one patch, validate, submit to queue.
 */
export async function runDailyAnalysis() {
    console.log('[OmegaCoder] Starting daily self-analysis...')
    try {
        const files = await scanAllowedFiles()
        if (files.length === 0) {
            console.log('[OmegaCoder] No files to analyze')
            return { status: 'no_files' }
        }

        // Pick a random file to avoid always editing the same one
        const target = files[Math.floor(Math.random() * files.length)]
        const patch = await generatePatch(target, 'Проведи мягкий рефакторинг: убери дублирование, улучши читаемость, добавь безопасные проверки.')
        const item = await submitToApprovalQueue(patch)

        console.log('[OmegaCoder] Patch submitted:', item.id, item.filePath)
        return { status: 'submitted', item }
    } catch (err) {
        console.error('[OmegaCoder] Daily analysis failed:', err.message)
        await logAttempt('daily_analysis_failed', { error: err.message }, 'medium')
        return { status: 'error', error: err.message }
    }
}

let dailyTimer = null

export function scheduleDailyAnalysis() {
    if (dailyTimer) return
    const DAY_MS = 24 * 60 * 60 * 1000
    runDailyAnalysis().catch(err => console.error('[OmegaCoder] initial analysis failed:', err.message))
    dailyTimer = setInterval(() => {
        runDailyAnalysis().catch(err => console.error('[OmegaCoder] scheduled analysis failed:', err.message))
    }, DAY_MS)
    console.log('[OmegaCoder] Daily analysis scheduled every 24h')
}

export function stopDailyAnalysis() {
    if (dailyTimer) {
        clearInterval(dailyTimer)
        dailyTimer = null
    }
}
