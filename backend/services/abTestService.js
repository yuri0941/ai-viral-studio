import { generateContent } from './aiService.js'
import { ScheduledPost } from '../models/index.js'

export async function createABTest({ userId, postParams, scheduledAt, platform }) {
    const variants = []
    const prompts = [
        `Write a viral ${platform || 'social media'} post about: ${postParams.topic}. Style: punchy, high-energy, with a strong CTA.`,
        `Write a viral ${platform || 'social media'} post about: ${postParams.topic}. Style: storytelling, emotional, with a soft CTA.`,
    ]

    for (let i = 0; i < prompts.length; i++) {
        try {
            const result = await generateContent('script', { topic: prompts[i], platform })
            variants.push({
                id: `variant-${i + 1}`,
                label: i === 0 ? 'A (Прямой CTA)' : 'B (История)',
                text: result.success ? result.content : result.error || 'Ошибка генерации',
                provider: result.provider || null,
            })
        } catch (err) {
            variants.push({
                id: `variant-${i + 1}`,
                label: i === 0 ? 'A' : 'B',
                text: `Ошибка: ${err.message}`,
                provider: null,
            })
        }
    }

    const test = await ScheduledPost.create({
        userId,
        platform: platform || 'instagram',
        content: variants[0]?.text || '',
        variants,
        abTest: {
            active: true,
            selectedVariant: null,
            metrics: { a: { impressions: 0, clicks: 0 }, b: { impressions: 0, clicks: 0 } },
        },
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'draft',
    })

    return {
        success: true,
        testId: test._id,
        variants,
    }
}

export async function selectVariant({ testId, variantId }) {
    const post = await ScheduledPost.findById(testId)
    if (!post) return { success: false, message: 'A/B test not found' }

    const variant = post.variants?.find(v => v.id === variantId)
    if (!variant) return { success: false, message: 'Variant not found' }

    post.content = variant.text
    post.abTest.selectedVariant = variantId
    post.abTest.active = false
    post.status = 'scheduled'
    await post.save()

    return { success: true, post }
}

export async function checkAIRequired() {
    const hasGroq = !!process.env.GROQ_API_KEY
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
    if (!hasGroq && !hasOpenRouter) {
        return {
            required: true,
            status: 'ai_required',
            message: 'A/B тесты требуют подключенного AI-провайдера',
            actionUrl: '/owner?tab=apiKeys',
        }
    }
    return { required: false }
}

export default {
    createABTest,
    selectVariant,
    checkAIRequired,
}
