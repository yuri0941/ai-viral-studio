import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ScheduledPost from '../models/ScheduledPost.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMPLATES_PATH = path.join(__dirname, '../data/omegaTemplates.json')

function loadTemplates() {
    try {
        const raw = fs.readFileSync(TEMPLATES_PATH, 'utf8')
        return JSON.parse(raw)
    } catch (err) {
        console.error('[templateEvolution] failed to load templates:', err.message)
        return { templates: [], lastEvolvedAt: null }
    }
}

function saveTemplates(data) {
    try {
        fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(data, null, 2), 'utf8')
        return true
    } catch (err) {
        console.error('[templateEvolution] failed to save templates:', err.message)
        return false
    }
}

function estimateCTR(post) {
    const views = Number(post.analytics?.views) || Number(post.views) || 0
    const likes = Number(post.analytics?.likes) || Number(post.likes) || 0
    const shares = Number(post.analytics?.shares) || Number(post.shares) || 0
    const comments = Number(post.analytics?.comments) || Number(post.comments) || 0
    if (!views || views <= 0) return 0
    const engagement = likes + shares * 2 + comments * 3
    return Math.min(100, Math.round((engagement / views) * 100 * 100) / 100)
}

export async function analyzeTemplatePerformance() {
    const data = loadTemplates()
    const templates = data.templates || []
    if (templates.length === 0) return { analyzed: 0, updated: 0 }

    const posts = await ScheduledPost.find({ status: 'published' }).lean()
    const templateMap = Object.fromEntries(templates.map(t => [t.id, t]))

    let updated = 0

    for (const post of posts) {
        const templateId = post.templateId || post.metadata?.templateId
        if (!templateId || !templateMap[templateId]) continue

        const ctr = estimateCTR(post)
        const tmpl = templateMap[templateId]
        if (!tmpl.metrics) tmpl.metrics = { ctr: 0, samples: 0, status: 'new' }

        const totalSamples = tmpl.metrics.samples + 1
        const avgCtr = ((tmpl.metrics.ctr * tmpl.metrics.samples) + ctr) / totalSamples
        tmpl.metrics.ctr = Math.round(avgCtr * 100) / 100
        tmpl.metrics.samples = totalSamples

        if (tmpl.metrics.ctr >= 12) {
            tmpl.metrics.status = 'proven'
            tmpl.badge = '🔥 Proven'
        } else if (tmpl.metrics.ctr < 3 && tmpl.metrics.samples >= 5) {
            tmpl.metrics.status = 'archived'
            tmpl.badge = '📦 Archived'
        } else {
            tmpl.metrics.status = 'new'
            tmpl.badge = '🆕 New'
        }

        updated++
    }

    // Evolve top proven templates: update previewText if aiText samples exist
    const proven = templates.filter(t => t.metrics?.status === 'proven' && Array.isArray(t.aiTexts) && t.aiTexts.length)
    for (const t of proven) {
        const best = t.aiTexts.sort((a, b) => (b.ctr || 0) - (a.ctr || 0))[0]
        if (best?.text) {
            t.previewText = best.text.slice(0, 200)
        }
    }

    data.lastEvolvedAt = new Date().toISOString()
    saveTemplates(data)

    return { analyzed: posts.length, updated, templates }
}

export function getTemplateStats() {
    const data = loadTemplates()
    const templates = data.templates || []
    const byCategory = templates.reduce((acc, t) => {
        const key = t.category || 'unknown'
        if (!acc[key]) acc[key] = { total: 0, proven: 0, avgCtr: 0 }
        acc[key].total++
        if (t.metrics?.status === 'proven') acc[key].proven++
        acc[key].avgCtr += t.metrics?.ctr || 0
        return acc
    }, {})

    for (const key of Object.keys(byCategory)) {
        byCategory[key].avgCtr = byCategory[key].total > 0
            ? Math.round((byCategory[key].avgCtr / byCategory[key].total) * 100) / 100
            : 0
    }

    return {
        total: templates.length,
        proven: templates.filter(t => t.metrics?.status === 'proven').length,
        archived: templates.filter(t => t.metrics?.status === 'archived').length,
        new: templates.filter(t => !t.metrics?.status || t.metrics?.status === 'new').length,
        byCategory,
        byId: Object.fromEntries(templates.map(t => [t.id, { badge: t.badge, metrics: t.metrics }])),
    }
}

export async function runEvolutionCron() {
    console.log('[templateEvolution] starting daily evolution...')
    const result = await analyzeTemplatePerformance()
    console.log('[templateEvolution] done:', result)
    return result
}

export default { analyzeTemplatePerformance, getTemplateStats, runEvolutionCron }
