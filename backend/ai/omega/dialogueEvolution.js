import { DialogueProfile } from '../../models/DialogueProfile.js'

const TONE_PATTERNS = {
    formal: ['уважаемый', 'прошу', 'с уважением', 'будьте добры', 'пожалуйста', ' formal', 'request'],
    casual: ['привет', 'йо', 'короче', 'типа', 'кстати', 'брат', 'дружище', 'чувак', 'hi', 'yo', 'hey'],
    ironic: ['конечно', 'очевидно', 'гениально', 'wow', 'brilliant', 'obviously', 'seriously', 'really'],
    technical: ['api', 'endpoint', 'json', 'middleware', 'контейнер', 'деплой', 'инстанс', 'база данных', 'schema', 'query'],
}

const VIRAL_VOCABULARY = ['сигма', 'ризз', 'хайп', 'крипто', 'вирус', 'тренд', 'залет', 'хит', 'прокачка', 'инсайт']

export class DialogueEvolution {
    async trackTone(userId, message) {
        if (!userId || !message) return 'neutral'
        const lower = String(message).toLowerCase()
        const scores = {}
        for (const [tone, words] of Object.entries(TONE_PATTERNS)) {
            scores[tone] = words.reduce((sum, w) => sum + (lower.includes(w) ? 1 : 0), 0)
        }
        const tone = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
        if (scores[tone] === 0) return 'neutral'

        await DialogueProfile.findOneAndUpdate(
            { userId },
            { tone, lastAdaptedAt: new Date() },
            { upsert: true, new: true }
        )
        return tone
    }

    async adaptResponse(userId, baseResponse) {
        if (!userId || !baseResponse) return baseResponse
        const profile = await DialogueProfile.findOne({ userId }).lean()
        if (!profile) return baseResponse

        let adapted = baseResponse
        const tone = profile.tone || 'neutral'
        if (tone === 'formal') {
            adapted = `Добрый день! Вот анализ и рекомендации:\n\n${baseResponse}`
        } else if (tone === 'casual') {
            adapted = `Привет! Смотри, тут такое:\n\n${baseResponse}`
        } else if (tone === 'ironic') {
            adapted = `Ну, раз уж спросили — вот моя «гениальная» версия:\n\n${baseResponse}`
        } else if (tone === 'technical') {
            adapted = `Технический разбор:\n\n${baseResponse}`
        }

        // Emotional memory: frustration 3 times in a row
        const recent = (profile.emotionalHistory || []).slice(-3)
        const frustrated = recent.length >= 3 && recent.every(e => e.emotion === 'frustration' && e.intensity > 0.6)
        if (frustrated) {
            adapted = `Понимаю, давайте разберёмся вместе. Я подготовил упрощённый вариант:\n\n${adapted}`
        }

        return adapted
    }

    async emotionalMemory(userId, emotion, intensity = 0.5) {
        if (!userId) return
        await DialogueProfile.findOneAndUpdate(
            { userId },
            { $push: { emotionalHistory: { $each: [{ emotion, intensity, date: new Date() }], $slice: -20 } } },
            { upsert: true }
        )
    }

    async evolveVocabulary() {
        let trends = []
        try {
            const { WebResearchEngine } = await import('./webResearchEngine.js')
            const engine = new WebResearchEngine()
            const res = await engine.researchTopic('viral marketing slang 2026', 1)
            trends = res?.sources?.map(s => s.title).filter(Boolean) || []
        } catch (err) {
            trends = []
        }
        const newWords = [...VIRAL_VOCABULARY, ...trends].slice(0, 20)
        // Note: vocabulary is per-user; we don't update all profiles globally in this version
        return { added: newWords.length, words: newWords }
    }
}

const engine = new DialogueEvolution()
export default engine
