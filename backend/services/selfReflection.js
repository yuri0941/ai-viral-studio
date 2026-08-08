import cron from 'node-cron'
import { AuditLog } from '../models/index.js'
import { alertOwner } from './ownerBot.js'
import { queryMesh, createNode } from './cognitiveMesh.js'
import { chatWithAI } from './aiService.js'

let reflectionJob = null

export function startSelfReflectionCron() {
    if (reflectionJob) return
    reflectionJob = cron.schedule('0 9 * * *', async () => {
        console.log('[selfReflection] running morning report cron')
        try {
            await sendMorningReport()
        } catch (err) {
            console.error('[selfReflection] cron failed:', err.message)
        }
    })
    console.log('[selfReflection] cron started (daily at 09:00)')
}

export function stopSelfReflectionCron() {
    if (reflectionJob) {
        reflectionJob.stop()
        reflectionJob = null
    }
}

export async function analyzeLast24Hours(ownerId = null) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const query = { timestamp: { $gte: since } }
    if (ownerId) query.ownerId = ownerId

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).lean()

    const errors = logs.filter(l => l.severity === 'high' || l.severity === 'critical')
    const apiErrors = errors.filter(l => /api|key|timeout|groq|openrouter|ai/i.test(l.action))
    const dbErrors = errors.filter(l => /mongo|database|db/i.test(l.action))
    const otherErrors = errors.filter(l => !apiErrors.includes(l) && !dbErrors.includes(l))

    const patterns = []
    if (apiErrors.length >= 3) patterns.push(`Повторяющиеся ошибки AI/API (${apiErrors.length}) — проверьте GROQ_API_KEY / OPENROUTER_API_KEY и лимиты.`)
    if (dbErrors.length >= 2) patterns.push(`Проблемы с MongoDB (${dbErrors.length}) — проверьте MONGO_URI / Render Database.`)
    if (logs.filter(l => l.type === 'security').length >= 5) patterns.push(`Много событий безопасности — проверьте логины и интеграции.`)

    const recommendations = []
    if (apiErrors.length > 0) recommendations.push('Проверить активные API-ключи в настройках AI-провайдеров')
    if (dbErrors.length > 0) recommendations.push('Добавить индекс на createdAt для часто читаемых коллекций')
    if (logs.filter(l => l.action.includes('Crisis')).length > 0) recommendations.push('Проверить Crisis Center и активные алерты')

    return {
        totalErrors: errors.length,
        apiErrors: apiErrors.length,
        dbErrors: dbErrors.length,
        otherErrors: otherErrors.length,
        patterns,
        recommendations,
        topActions: aggregateActions(logs),
        generatedAt: new Date().toISOString(),
    }
}

function aggregateActions(logs) {
    const counts = {}
    for (const log of logs) {
        counts[log.action] = (counts[log.action] || 0) + 1
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }))
}

export async function sendMorningReport(ownerId) {
    const report = await analyzeLast24Hours(ownerId)
    if (report.totalErrors === 0 && report.recommendations.length === 0) {
        return { sent: false, reason: 'no issues' }
    }

    const message = [
        '📊 <b>OMEGA Self-Reflection: отчёт за 24 часа</b>',
        `Ошибок: ${report.totalErrors} (AI/API: ${report.apiErrors}, DB: ${report.dbErrors}, другие: ${report.otherErrors})`,
        '',
        '<b>Паттерны:</b>',
        ...report.patterns.map(p => `• ${p}`),
        '',
        '<b>Рекомендации:</b>',
        ...report.recommendations.map(r => `• ${r}`),
    ].join('\n')

    await alertOwner(message).catch(() => {})
    return { sent: true, report }
}

export default { analyzeLast24Hours, sendMorningReport, analyzeDailyPerformance, getPromptAdjustments }

// === v9.6 SELF-OPTIMIZE additions ===
export async function analyzeDailyPerformance(ownerId, date = new Date()) {
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999)
  const nodes = await queryMesh(`owner:${ownerId}`, 100, 0.3)
  const todayNodes = nodes.filter(n => {
    const d = new Date(n.createdAt || n.timestamp)
    return d >= startOfDay && d <= endOfDay
  })
  const interactions = todayNodes.filter(n => n.type === 'telegram' || n.type === 'chat' || n.type === 'decision')
  const successful = interactions.filter(n => n.metadata?.outcome === 'success' || n.confidence > 0.8).length
  const failed = interactions.filter(n => n.metadata?.outcome === 'failure' || n.confidence < 0.4).length
  const ignored = interactions.length - successful - failed
  const prompt = `Analyze OMEGA's performance today. Interactions: ${interactions.length}, Successful: ${successful}, Failed: ${failed}, Ignored: ${ignored}. Sample interactions: ${interactions.slice(-5).map(i => i.content.slice(0, 100)).join('; ')}. Return JSON: { score: 0-100, weaknesses: [{issue, severity, suggestion}], strengths: [{area, example}], promptAdjustments: [{target, oldStyle, newStyle}] }`
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.3 })
  let report
  try { report = JSON.parse(aiResult?.reply || aiResult?.text || '{}') } catch (e) { report = { score: 70, weaknesses: [], strengths: [], promptAdjustments: [] } }
  await createNode({ type: 'system', content: `Self-reflection report for ${date.toDateString()}: score ${report.score}`, confidence: 0.95, source: 'self_reflection', metadata: { ownerId, report, date, type: 'daily_reflection' } })
  return report
}

export async function getPromptAdjustments(ownerId) {
  const reflections = await queryMesh(`self_reflection owner:${ownerId}`, 10, 0.8)
  const adjustments = reflections.flatMap(r => r.metadata?.report?.promptAdjustments || [])
  return adjustments
}

