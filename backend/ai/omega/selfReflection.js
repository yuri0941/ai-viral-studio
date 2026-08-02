// ============================================
// OMEGA Self-Reflection Loop — анализ ошибок и коррекция промптов
// ============================================

import cron from 'node-cron'
import { AuditLog } from '../../models/index.js'
import { chatWithAI } from '../../services/aiService.js'
import * as neuralGraph from './neuralGraph.js'

let reflectionJob = null
let lessonCount = 0

const SYSTEM_PROMPT_REFLECTION = `Ты — OMEGA Self-Reflection. Проанализируй список ошибок за последние 6 часов. Для каждой группы:
1. Объясни, почему произошло (корневая причина).
2. Предложи конкретное действие по предотвращению.
3. Сформулируй краткий урок в 1-2 предложения.

Ответь строго в JSON:
{
  "lessons": [
    { "category": "api|db|security|logic", "reason": "...", "prevention": "...", "lesson": "..." }
  ]
}`

export async function reflectionCycle() {
    console.log('[selfReflection] running reflection cycle')

    const since = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const logs = await AuditLog.find({
        timestamp: { $gte: since },
        $or: [
            { severity: { $in: ['high', 'critical'] } },
            { action: { $regex: /error|fail|timeout|unauthorized|blocked/i } },
        ],
    }).sort({ timestamp: -1 }).lean()

    if (logs.length === 0) {
        console.log('[selfReflection] no errors in last 6h')
        return { lessons: [] }
    }

    const errorLines = logs.map(l => {
        const meta = typeof l.metadata === 'object' ? JSON.stringify(l.metadata) : ''
        return `- [${l.severity}] ${l.action}: ${meta.slice(0, 200)}`
    }).join('\n')

    const prompt = `${SYSTEM_PROMPT_REFLECTION}\n\nСобытия:\n${errorLines}`

    let lessons = []
    try {
        const aiResult = await chatWithAI(prompt, [], 'ru')
        const text = aiResult?.reply || ''
        try {
            const match = text.match(/\{[\s\S]*\}/)
            const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
            lessons = Array.isArray(parsed.lessons) ? parsed.lessons : []
        } catch (parseErr) {
            console.warn('[selfReflection] parse failed:', parseErr.message)
            lessons = []
        }
    } catch (err) {
        console.error('[selfReflection] AI analysis failed:', err.message)
        return { lessons: [] }
    }

    // Сохраняем уроки как узлы графа
    lessonCount += lessons.length
    for (const lesson of lessons) {
        try {
            neuralGraph.addNode('error_lesson', lesson.lesson || lesson.prevention, {
                category: lesson.category,
                reason: lesson.reason,
                prevention: lesson.prevention,
                source: 'self_reflection',
                reflectedAt: new Date().toISOString(),
            }, [], { accessLevel: 'owner' })
        } catch (nodeErr) {
            console.warn('[selfReflection] graph node failed:', nodeErr.message)
        }
    }

    // Корректируем системные промпты — сохраняем в граф
    if (lessons.length > 0) {
        const promptUpdate = lessons.map(l => l.prevention).filter(Boolean).join('\n')
        neuralGraph.addNode('system_prompt_patch', `Reflection patch ${new Date().toISOString()}`, {
            patch: promptUpdate,
            source: 'self_reflection',
        }, [], { accessLevel: 'owner' })
    }

    console.log(`[selfReflection] generated ${lessons.length} lessons`)
    return { lessons, errorsAnalyzed: logs.length }
}

export function startReflectionCron() {
    if (reflectionJob) return
    reflectionJob = cron.schedule('0 */6 * * *', async () => {
        try {
            await reflectionCycle()
        } catch (err) {
            console.error('[selfReflection] cron failed:', err.message)
        }
    })
    console.log('[selfReflection] cron started (every 6 hours)')
}

export function stopReflectionCron() {
    if (reflectionJob) {
        reflectionJob.stop()
        reflectionJob = null
    }
}

export function getReflectionStatus() {
    return { active: !!reflectionJob, lessonCount }
}

export default { reflectionCycle, startReflectionCron, stopReflectionCron, getReflectionStatus }
