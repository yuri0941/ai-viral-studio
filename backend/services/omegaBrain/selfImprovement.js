import mongoose from 'mongoose'
import { OmegaBrainMemory } from './memoryStore.js'
import { pickTemplate } from './templates.js'

const templateSchema = new mongoose.Schema({
    pattern: { type: String, required: true },
    template: { type: String, required: true },
    rating: { type: Number, default: 0 },
    source: { type: String, default: 'auto' },
    createdAt: { type: Date, default: Date.now },
})

export const OmegaTemplate = mongoose.models.OmegaTemplate || mongoose.model('OmegaTemplate', templateSchema, 'omega_templates')

const PROVIDERS_TO_ANALYZE = ['groq', 'openrouter']

export async function analyzeRecurringQuestions() {
    try {
        const dialogs = await OmegaBrainMemory.find({
            type: 'dialog',
            provider: { $in: PROVIDERS_TO_ANALYZE },
        }).lean()

        const frequency = {}
        for (const d of dialogs) {
            const q = (d.question || '').toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
            if (!q || q.length < 5) continue
            frequency[q] = (frequency[q] || 0) + 1
        }

        for (const [question, count] of Object.entries(frequency)) {
            if (count > 3) {
                const existing = await OmegaTemplate.findOne({ pattern: question }).lean()
                if (existing) continue

                const template = pickTemplate('response', { name: '{name}', niche: '{niche}' })
                await OmegaTemplate.create({
                    pattern: question,
                    template: `${template} (авто-шаблон для: ${question})`,
                    rating: 0,
                    source: 'auto',
                })
                console.log(`[selfImprovement] created template for repeated question: ${question}`)
            }
        }
    } catch (err) {
        console.warn('[selfImprovement] analyze failed:', err.message)
    }
}

export function startSelfImprovementCron(intervalMs = 24 * 60 * 60 * 1000) {
    analyzeRecurringQuestions()
    return setInterval(() => {
        analyzeRecurringQuestions().catch(err => console.warn('[selfImprovement] cron error:', err.message))
    }, intervalMs)
}

export default { analyzeRecurringQuestions, startSelfImprovementCron, OmegaTemplate }
