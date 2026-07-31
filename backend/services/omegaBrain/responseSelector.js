import { findSimilarDialog, saveDialog, saveFact, searchVectorMemory } from './memoryStore.js'
import { buildContext } from './contextEngine.js'
import { pickTemplate, classifyQuestion } from './templates.js'
import aiService from '../aiService.js'
import { runAgentsForQuery, formatAgentResults } from '../omegaAgents/agentRunner.js'
import { searchWeb, formatWebResults, isWebSearchQuery } from '../webSearch.js'

const BRAIN_MIN_RATING = 2

function buildEnhancedPrompt(userContext, question, extra = {}) {
    const { name = 'пользователь', niche = 'контент', language = 'ru' } = userContext
    const parts = []
    parts.push(`Ты — AI Viral Studio OMEGA. Язык: ${language}.`)
    parts.push(`Контекст: пользователь ${name}, ниша ${niche}.`)
    if (extra.context) parts.push(extra.context)
    if (extra.vectorResults) parts.push(extra.vectorResults)
    if (extra.webResults) parts.push(extra.webResults)
    if (extra.agentResults) parts.push(extra.agentResults)
    parts.push(`Вопрос: ${question}`)
    return parts.join('\n\n')
}

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

    // 2) Vector memory search
    let vectorResults = ''
    try {
        const matches = await searchVectorMemory(question, 3)
        if (matches?.length > 0) {
            vectorResults = 'Похожие воспоминания OMEGA:\n' + matches.map(m => `- ${m.text}`).join('\n')
        }
    } catch (err) {
        console.warn('[responseSelector] vector search failed:', err.message)
    }

    // 3) Agents + Web search enrichment
    let webResults = ''
    let agentResults = ''
    try {
        const agents = await runAgentsForQuery(question)
        agentResults = formatAgentResults(agents)
    } catch (err) {
        console.warn('[responseSelector] agents failed:', err.message)
    }

    try {
        if (isWebSearchQuery(question)) {
            const web = await searchWeb(question, 3)
            webResults = formatWebResults(web)
            await saveFact(userId, webResults).catch(() => {})
        }
    } catch (err) {
        console.warn('[responseSelector] web search failed:', err.message)
    }

    // 4) External AI chain with enriched prompt
    let aiResult = null
    let aiError = null
    try {
        const context = await buildContext(userId, { question }).catch(() => '')
        const prompt = buildEnhancedPrompt(userContext, question, { context, vectorResults, webResults, agentResults })
        aiResult = await aiService.chatWithAI(prompt, [], userContext.language || 'ru')
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

    // 5) Smart template
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

    // 6) All failed
    return {
        reply: 'AI временно недоступен. Попробуйте позже.',
        provider: 'error',
        error: aiError?.message || 'No response source available',
    }
}

export default { selectResponse }
