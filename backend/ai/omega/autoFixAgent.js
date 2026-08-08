import { AuditLog } from '../../models/AuditLog.js'
import { AutoFixLog } from '../../models/AutoFixLog.js'
import { chatWithAI } from '../../services/aiService.js'
import { alertOwner } from '../../services/ownerBot.js'

const ERROR_PATTERNS = [
    { regex: /401|Unauthorized|unauthorized/, type: '401 Unauthorized', priority: 'high', module: 'auth' },
    { regex: /500|Internal Server Error/, type: '500 Server Error', priority: 'critical', module: 'server' },
    { regex: /TypeError/, type: 'TypeError', priority: 'high', module: 'runtime' },
    { regex: /ReferenceError/, type: 'ReferenceError', priority: 'high', module: 'runtime' },
    { regex: /MongoError|MongoServerError|Mongoose/, type: 'Database Error', priority: 'critical', module: 'database' },
    { regex: /ECONNREFUSED|timeout|NetworkError/, type: 'Network Error', priority: 'medium', module: 'network' },
]

const CRITICAL_TYPES = ['500 Server Error', 'Database Error', 'crash']

async function loadRecentAuditLogs(limit = 100) {
    try {
        return await AuditLog.find({
            $or: [
                { severity: { $in: ['high', 'critical'] } },
                { action: { $regex: /error|failed|exception|crash|timeout/i } },
            ]
        }).sort({ timestamp: -1 }).limit(limit).lean()
    } catch (err) {
        console.error('[autoFixAgent] loadRecentAuditLogs failed:', err.message)
        return []
    }
}

function classifyError(log) {
    const text = `${log.action || ''} ${log.metadata ? JSON.stringify(log.metadata) : ''}`
    for (const pattern of ERROR_PATTERNS) {
        if (pattern.regex.test(text)) {
            return { type: pattern.type, priority: pattern.priority, module: pattern.module }
        }
    }
    return { type: 'Unknown Error', priority: 'low', module: 'unknown' }
}

export async function scanForErrors() {
    const logs = await loadRecentAuditLogs()
    if (!logs || logs.length === 0) {
        console.log('[autoFixAgent] No errors found')
        return []
    }
    const grouped = {}
    for (const log of logs) {
        const { type, priority, module } = classifyError(log)
        if (!grouped[type]) grouped[type] = { count: 0, logs: [], priority, module }
        grouped[type].count += 1
        grouped[type].logs.push(log)
    }

    const results = []
    for (const [type, group] of Object.entries(grouped)) {
        const representative = group.logs[0]
        const isCritical = CRITICAL_TYPES.includes(type) || group.priority === 'critical'
        const fix = await analyzeError({ type, stack: representative.action, metadata: representative.metadata })
        const proposal = await createFixProposal({ type, stack: representative.action, metadata: representative.metadata }, fix, group.priority, group.module)
        results.push({ type, count: group.count, proposal, critical: isCritical })

        if (isCritical) {
            console.warn(`[autoFixAgent] CRITICAL error detected: ${type}. Proposal id ${proposal._id}. Owner alert required.`)
            try {
                await alertOwner(`🚨 AutoFix: критическая ошибка ${type}\nМодуль: ${group.module}\nПредложение: ${proposal._id}\n\n${fix.explanation?.slice(0, 200) || ''}`, 'error')
            } catch (e) {
                console.warn('[autoFixAgent] telegram alert failed:', e.message)
            }
        }
    }

    // Batch non-critical if >=5
    const nonCritical = Object.entries(grouped).filter(([_, g]) => g.priority !== 'critical' && g.count >= 5)
    if (nonCritical.length) {
        console.log(`[autoFixAgent] batch non-critical proposals: ${nonCritical.length} groups`)
    }

    return results
}

function safeJSONParse(text, fallback = null) {
  if (!text) return fallback
  // Убираем markdown-обёртку ```json ... ```
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  // Убираем BOM и невидимые символы
  cleaned = cleaned.replace(/^\uFEFF/, '')
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Пробуем найти первый { и последний }
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) } catch (e2) {}
    }
    // Пробуем найти первый [ и последний ]
    const firstBracket = cleaned.indexOf('[')
    const lastBracket = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try { return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) } catch (e3) {}
    }
    console.error('[safeJSONParse] Failed to parse:', text.slice(0, 200))
    return fallback
  }
}

export async function analyzeError(error) {
    try {
        const prompt = `Ошибка: ${error.type}\nStack: ${error.stack || ''}\nMetadata: ${error.metadata ? JSON.stringify(error.metadata) : ''}\n\nКак исправить? Верни JSON: {"fix":"код или описание исправления","explanation":"текст"}`
        const ai = await chatWithAI(prompt, [], 'ru', { userRole: 'owner' })
        const reply = ai?.reply || ai?.text || ''
        const match = reply.match(/\{[\s\S]*\}/)
        const json = match ? safeJSONParse(match[0], { fix: '', explanation: '' }) : { fix: '', explanation: '' }
        return { fix: json.fix || '', explanation: json.explanation || '' }
    } catch (err) {
        console.error('[autoFixAgent] analyzeError failed:', err.message)
        return { fix: '', explanation: 'Не удалось проанализировать ошибку. Требуется ручной осмотр.' }
    }
}

export async function createFixProposal(error, fix, priority, module) {
    return AutoFixLog.create({
        errorType: error.type,
        errorStack: error.stack || '',
        fixCode: fix.fix || '',
        fixExplanation: fix.explanation || '',
        status: 'proposed',
        module: module || 'unknown',
        priority: priority || 'low',
    })
}

export async function getStatus() {
    const counts = await AutoFixLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    const map = Object.fromEntries(counts.map(c => [c._id, c.count]))
    return {
        detected: map.detected || 0,
        analyzing: map.analyzing || 0,
        proposed: map.proposed || 0,
        approved: map.approved || 0,
        rejected: map.rejected || 0,
        deployed: map.deployed || 0,
    }
}

export async function getLogs(filter = {}) {
    return AutoFixLog.find(filter).sort({ createdAt: -1 }).lean()
}

export async function approveFix(id) {
    return AutoFixLog.findByIdAndUpdate(id, { status: 'approved' }, { new: true }).lean()
}

export async function rejectFix(id) {
    return AutoFixLog.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).lean()
}

// Eager-start cron if module loaded in runtime
if (process.env.NODE_ENV !== 'test') {
    import('node-cron').then(({ default: cron }) => {
        cron.schedule('*/15 * * * *', () => {
            console.log('[autoFixAgent] scanning for errors')
            scanForErrors().catch(err => console.error('[autoFixAgent] cron error:', err.message))
        })
    }).catch(() => {})
}
