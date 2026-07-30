// ============================================
// OMEGA Communication — стиль, эмоции, адаптация
// Версия: 1.0 Lite (фундамент для OMEGA v5)
// ============================================

/**
 * Пресеты личности OMEGA.
 */
export const PERSONALITY_PRESETS = {
    professional: {
        name: 'Professional',
        tone: 'formal',
        length: 'medium',
        emoji: false,
        humor: 0,
        initiative: 0.3,
        greeting: 'Здравствуйте',
    },
    friendly: {
        name: 'Friendly',
        tone: 'casual',
        length: 'medium',
        emoji: true,
        humor: 0.3,
        initiative: 0.5,
        greeting: 'Привет',
    },
    concise: {
        name: 'Concise',
        tone: 'direct',
        length: 'short',
        emoji: false,
        humor: 0,
        initiative: 0.2,
        greeting: 'Привет',
    },
    visionary: {
        name: 'Visionary',
        tone: 'inspiring',
        length: 'long',
        emoji: true,
        humor: 0.2,
        initiative: 0.7,
        greeting: 'Привет',
    },
}

/**
 * Эмоциональные состояния.
 */
export const EMOTIONS = {
    NEUTRAL: 'neutral',
    HAPPY: 'happy',
    FRUSTRATED: 'frustrated',
    URGENT: 'urgent',
    CURIOUS: 'curious',
    CONFUSED: 'confused',
}

/**
 * Детектор эмоций на основе ключевых слов.
 */
export function detectEmotion(text) {
    const lower = (text || '').toLowerCase()
    const scores = {
        [EMOTIONS.URGENT]: ['срочно', 'немедленно', 'авария', 'сломалось', 'ошибка', 'urgent', 'asap', 'broken'],
        [EMOTIONS.FRUSTRATED]: ['бесит', 'раздражает', 'не работает', 'фигня', 'уберите', 'frustrated', 'annoying'],
        [EMOTIONS.CURIOUS]: ['как', 'почему', 'что если', 'расскажи', 'how', 'why', 'explain'],
        [EMOTIONS.CONFUSED]: ['не понимаю', 'запутался', 'не ясно', 'confused', 'lost', 'unclear'],
        [EMOTIONS.HAPPY]: ['спасибо', 'отлично', 'круто', 'супер', 'thanks', 'great', 'awesome'],
        [EMOTIONS.NEUTRAL]: [],
    }

    let detected = EMOTIONS.NEUTRAL
    let max = 0
    for (const [emotion, triggers] of Object.entries(scores)) {
        const count = triggers.filter(t => lower.includes(t)).length
        if (count > max) {
            max = count
            detected = emotion
        }
    }
    return { emotion: detected, intensity: Math.min(1, 0.3 + max * 0.2) }
}

/**
 * OmegaPersonality — настройки личности OMEGA.
 */
export class OmegaPersonality {
    constructor(preset = 'friendly', overrides = {}) {
        this.applyPreset(preset)
        Object.assign(this, overrides)
    }

    applyPreset(name) {
        const preset = PERSONALITY_PRESETS[name] || PERSONALITY_PRESETS.friendly
        this.name = preset.name
        this.tone = preset.tone
        this.length = preset.length
        this.emoji = preset.emoji
        this.humor = preset.humor
        this.initiative = preset.initiative
        this.greeting = preset.greeting
    }

    set(name, value) {
        if (this[name] === undefined) return false
        this[name] = value
        return true
    }

    export() {
        return {
            name: this.name,
            tone: this.tone,
            length: this.length,
            emoji: this.emoji,
            humor: this.humor,
            initiative: this.initiative,
            greeting: this.greeting,
        }
    }
}

/**
 * OmegaEmotionMemory — хранит эмоциональные реакции владельца.
 */
export class OmegaEmotionMemory {
    constructor() {
        this.reactions = []
        this.trustLevel = 0.5
        this.maxReactions = 100
    }

    record(context, emotion) {
        this.reactions.push({
            context,
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            timestamp: new Date().toISOString(),
        })
        this.updateTrust(emotion)
        while (this.reactions.length > this.maxReactions) {
            this.reactions.shift()
        }
    }

    updateTrust(emotion) {
        const delta = emotion.emotion === EMOTIONS.HAPPY ? 0.05
            : emotion.emotion === EMOTIONS.FRUSTRATED ? -0.08
            : emotion.emotion === EMOTIONS.URGENT ? 0.02
            : 0
        this.trustLevel = Math.max(0, Math.min(1, this.trustLevel + delta))
    }

    getTrustLevel() {
        return Math.round(this.trustLevel * 100) / 100
    }

    getRecent(emotion = null, limit = 10) {
        let items = [...this.reactions].reverse()
        if (emotion) items = items.filter(r => r.emotion === emotion)
        return items.slice(0, limit)
    }
}

/**
 * OmegaCommunicationAdapter — адаптирует ответ под личность и эмоцию.
 */
export class OmegaCommunicationAdapter {
    constructor(personality = new OmegaPersonality()) {
        this.personality = personality
        this.emotionMemory = new OmegaEmotionMemory()
    }

    setPersonality(presetOrInstance) {
        if (typeof presetOrInstance === 'string') {
            this.personality = new OmegaPersonality(presetOrInstance)
        } else {
            this.personality = presetOrInstance
        }
    }

    /**
     * Анализирует входящее сообщение и сохраняет эмоцию.
     */
    perceive(text) {
        const emotion = detectEmotion(text)
        this.emotionMemory.record(text, emotion)
        return emotion
    }

    /**
     * Адаптирует текст ответа под текущую личность и эмоцию.
     */
    adapt(response, incomingText = '') {
        const emotion = this.perceive(incomingText)
        const p = this.personality
        let adapted = response

        // Длина
        if (p.length === 'short') {
            adapted = adapted.split('\n').slice(0, 2).join('\n')
        } else if (p.length === 'long') {
            adapted += '\n\nЕсли нужно, могу подробнее объяснить любой пункт.'
        }

        // Тон и эмоция
        if (emotion.emotion === EMOTIONS.URGENT) {
            adapted = '⚠️ ' + adapted.replace(/здравствуйте|привет/gi, '').trim()
        }
        if (emotion.emotion === EMOTIONS.FRUSTRATED) {
            adapted = 'Понимаю ваше беспокойство. ' + adapted
        }

        // Эмодзи
        if (p.emoji && emotion.emotion !== EMOTIONS.URGENT) {
            adapted += ' ✨'
        }

        // Юмор
        if (p.humor > 0.3 && emotion.emotion === EMOTIONS.HAPPY) {
            adapted += ' \n(Надеюсь, OMEGA не перегрелся от таких комплиментов 😄)'
        }

        return {
            text: adapted,
            emotion,
            personality: p.export(),
            trustLevel: this.emotionMemory.getTrustLevel(),
        }
    }

    /**
     * Возвращает приветствие.
     */
    greet(name = '') {
        const p = this.personality
        return `${p.greeting}${name ? ', ' + name : ''}! Чем могу помочь?${p.emoji ? ' 👋' : ''}`
    }
}

export default OmegaCommunicationAdapter
