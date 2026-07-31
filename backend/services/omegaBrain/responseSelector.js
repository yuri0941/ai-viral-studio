import { findSimilarDialog, saveDialog } from './memoryStore.js'
import { buildContext } from './contextEngine.js'
import { pickTemplate, classifyQuestion } from './templates.js'
import aiService from '../aiService.js'

const BRAIN_MIN_RATING = 2

export async function selectResponse(userId, question, userContext = {}) {
    const { name = 'пользователь', niche = 'контент' } = userContext

    // 1) Brain — похожий вопрос с высоким рейтингом
    try {
        const similar = await findSimilarDialog(userId, question, 3)
        const best = similar.find(m => m.rating >= BRAIN_MIN_RATING)
        if (best?.answer) {
            return {
                reply: best.answer,
                provider: 'brain',
                memoryId: best._id,
                cached: true,
            }
        }
    } catch (err) {
        console.warn('[responseSelector] brain search failed:', err.message)
    }

    // 2) External AI chain
    let aiResult = null
    let aiError = null
    try {
        aiResult = await aiService.chatWithAI(question, [], userContext.language || 'ru')
    } catch (err) {
        aiError = err
        console.warn('[responseSelector] AI chain failed:', err.message)
    }

    if (aiResult?.success && aiResult.reply && !aiResult.demo) {
        try {
            await saveDialog(userId, question, aiResult.reply, aiResult.provider)
        } catch (saveErr) {
            console.warn('[responseSelector] saveDialog failed:', saveErr.message)
        }
        return {
            reply: aiResult.reply,
            provider: aiResult.provider || 'ai',
            cached: aiResult.cached || false,
        }
    }

    // 3) Smart template
    const category = classifyQuestion(question)
    const templateCtx = { name, niche: niche || 'твоей нише' }
    const templateReply = pickTemplate(category, templateCtx)
    if (templateReply) {
        try {
            await saveDialog(userId, question, templateReply, 'template')
        } catch (saveErr) {
            console.warn('[responseSelector] saveDialog template failed:', saveErr.message)
        }
        return {
            reply: templateReply,
            provider: 'template',
        }
    }

    // 4) All failed
    return {
        reply: 'AI временно недоступен. Попробуйте позже.',
        provider: 'error',
        error: aiError?.message || 'No response source available',
    }
}

export default { selectResponse }
