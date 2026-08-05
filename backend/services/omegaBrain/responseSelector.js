import { findSimilarDialog, saveDialog, saveFact, searchVectorMemory } from './memoryStore.js'
import { buildContext } from './contextEngine.js'
import { pickTemplate, classifyQuestion } from './templates.js'
import aiService from '../aiService.js'
import { runAgentsForQuery, formatAgentResults } from '../omegaAgents/agentRunner.js'
import { searchWeb, formatWebResults, isWebSearchQuery } from '../webSearch.js'
import { buildBrandVoicePrompt } from '../brandVoice.js'
import { getMemoryContext, extractAndSaveFacts } from '../../ai/omega/omegaMemory.js'
import * as neuralGraph from '../../ai/omega/neuralGraph.js'

const BRAIN_MIN_RATING = 2

function buildEnhancedPrompt(userContext, question, extra = {}) {
    const { name = 'пользователь', niche = 'контент', language = 'ru', brandVoice = '' } = userContext
    const parts = []
    const systemContext = extra.systemContext || `Ты — AI Viral Studio OMEGA. Язык: ${language}.`
    parts.push(systemContext)
    if (extra.memoryContext) parts.push(extra.memoryContext)
    if (extra.context) parts.push(extra.context)
    if (extra.vectorResults) parts.push(extra.vectorResults)
    if (extra.webResults) parts.push(extra.webResults)
    if (extra.agentResults) parts.push(extra.agentResults)
    parts.push(`Контекст: пользователь ${name}, ниша ${niche}.`)
    if (brandVoice) parts.push(`Стиль бренда: ${brandVoice}`)
    parts.push(`Вопрос: ${question}`)
    return parts.join('\n\n')
}

// [v5.9-CONT] added: object signature + userRole
export async function selectResponse({ userId, userContext = {}, userRole, message, history = [], providers = [], language = 'ru', extraSystem = '' }) {
    const { name = 'пользователь', niche = 'контент' } = userContext

    // 1) Brain — похожий вопрос с высоким рейтингом
    try {
        const similar = await findSimilarDialog(userId, message, 3)
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
        const matches = await searchVectorMemory(message, 3, userId)
        if (matches?.length > 0) {
            vectorResults = 'Похожие воспоминания OMEGA:\n' + matches.map(m => `- ${m.text}`).join('\n')
        }
    } catch (err) {
        console.warn('[responseSelector] vector search failed:', err.message)
    }

    // 3) OMEGA 8-layer memory: extract facts and load context
    let memoryContext = ''
    try {
        await extractAndSaveFacts(userId, message)
        memoryContext = await getMemoryContext(userId, { question: message, limit: 5 })
    } catch (err) {
        console.warn('[responseSelector] memory context failed:', err.message)
    }

    // 3.5) Neural graph context (relevant memory nodes)
    let graphContext = ''
    try {
        const graphNodes = neuralGraph.getContext(message, 3)
        if (graphNodes.length > 0) {
            graphContext = 'Релевантный контекст из нейро-графа:\n' + graphNodes.map(n => `- [${n.type}] ${n.label}`).join('\n')
        }
    } catch (err) {
        console.warn('[responseSelector] neural graph failed:', err.message)
    }

    // 4) Agents + Web search enrichment
    let webResults = ''
    let agentResults = ''
    try {
        const agents = await runAgentsForQuery(message)
        agentResults = formatAgentResults(agents)
    } catch (err) {
        console.warn('[responseSelector] agents failed:', err.message)
    }

    try {
        if (isWebSearchQuery(message)) {
            const web = await searchWeb(message, 3)
            webResults = formatWebResults(web)
            await saveFact({ userId, role: userRole || userContext?.role || 'client', fact: webResults, source: 'web' }).catch(() => {})
        }
    } catch (err) {
        console.warn('[responseSelector] web search failed:', err.message)
    }

    // 4) External AI chain with enriched prompt
    const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/|youtu\.be\/|tiktok\.com\/|instagram\.com\/reel\/|vm\.tiktok\.com\/)[\w\-]+/i
    const hasVideoUrl = urlRegex.test(message)
    const intent = hasVideoUrl ? 'video_analysis' : 'general'

    const rolePrompts = {
        owner: `Ты OMEGA, AI-ассистент AI Viral Studio. Пользователь — ВЛАДЕЛЕЦ платформы. Обращайся на "вы", уважительно. НЕ называй владельца "гостем". НЕ предлагай регистрацию.`,
        admin: `Ты OMEGA. Пользователь — АДМИНИСТРАТОР. Помогай с модерацией.`,
        staff: `Ты OMEGA. Пользователь — СОТРУДНИК. Помогай с тикетами.`,
        client: `Ты OMEGA. Пользователь — КЛИЕНТ. Обращайся дружелюбно, на "ты". Помогай с контентом.`,
        creator: `Ты OMEGA. Пользователь — КРЕАТОР. Обращайся на "ты", как опытный продюсер. НЕ называй гостем. Помогай с хуками, обложками, планами.`,
        advertiser: `Ты OMEGA. Пользователь — РЕКЛАМОДАТЕЛЬ. Помогай с кампаниями.`,
        guest: `Ты OMEGA. Пользователь — ГОСТЬ. Кратко представь возможности. Предложи зарегистрироваться.`
    }

    let baseSystemPrompt = extraSystem || ''

    if (history && history.length > 0) {
        baseSystemPrompt = baseSystemPrompt.replace(/Я OMEGA, ваш AI-ассистент\.?.*?Могу помочь.*?\n?/gi, '')
        baseSystemPrompt = baseSystemPrompt.replace(/Добро пожаловать в AI Viral Studio!?\*?\*?/gi, '')
    }

    if (intent === 'video_analysis') {
        baseSystemPrompt += `\n\nПользователь прислал ссылку на видео. НЕ начинай с "Я OMEGA". НЕ предлагай регистрацию. СРАЗУ проанализируй видео по структуре:\n### Хуки\n### Удержание внимания (Retention)\n### CTA (Призыв к действию)\n### Аудитория и ЦА\n### Вирусные моменты\n### Ошибки и что исправить\nДавай конкретные рекомендации, не общие фразы.`
    }

    const systemPrompt = `${rolePrompts[userRole] || rolePrompts.guest}

Текущая роль: ${userRole || 'guest'}.
Язык: ${language || 'ru'}.

${baseSystemPrompt}`
    let aiResponse = null
    let aiError = null
    try {
        const context = await buildContext(userId, { question: message }).catch(() => '')
        const prompt = buildEnhancedPrompt(userContext, message, { context, vectorResults, webResults, agentResults, memoryContext, graphContext, systemContext: systemPrompt })
        aiResponse = await aiService.chatWithAI(prompt, [], language)
    } catch (err) {
        aiError = err
        console.warn('[responseSelector] AI chain failed:', err.message)
    }

    const usedProvider = aiResponse?.provider || 'ai'
    if (aiResponse?.success && aiResponse.reply && !aiResponse.demo) {
        try {
            await saveDialog({
                userId,
                role: userRole || userContext?.role || 'client', // [v5.9-CONT] added role
                text: message,
                response: aiResponse.reply,
                provider: usedProvider,
            })
        } catch (saveErr) {
            console.warn('[responseSelector] saveDialog failed:', saveErr.message)
        }
        return {
            reply: aiResponse.reply,
            provider: usedProvider,
            cached: aiResponse.cached || false,
        }
    }

    // 5) Smart template
    const category = classifyQuestion(message)
    const templateCtx = { name, niche: niche || 'твоей нише' }
    const templateReply = pickTemplate(category, templateCtx)
    if (templateReply) {
        try {
            await saveDialog({
                userId,
                role: userRole || userContext?.role || 'client', // [v5.9-CONT] added role
                text: message,
                response: templateReply,
                provider: 'template',
            })
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
