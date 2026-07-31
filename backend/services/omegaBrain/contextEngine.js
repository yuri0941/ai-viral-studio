import User from '../../models/User.js'
import { getMemory } from './memoryStore.js'

export async function buildContext(userId, { question } = {}) {
    const user = await User.findById(userId).lean()
    if (!user) return ''

    const facts = await getMemory(userId, { type: 'fact', limit: 10, minRating: 0 })
    const factLines = facts.map(f => f.content).join('\n- ')

    const prefs = user.preferences || {}
    const lines = [
        `Пользователь: ${user.name || 'пользователь'}.`,
        prefs.niche ? `Ниша: ${prefs.niche}.` : '',
        prefs.style ? `Стиль общения: ${prefs.style}.` : '',
        prefs.language ? `Язык: ${prefs.language}.` : '',
        factLines ? `Факты о пользователе:\n- ${factLines}` : '',
    ].filter(Boolean)

    if (question) {
        lines.push(`Текущий вопрос: ${question}`)
    }

    return lines.join('\n')
}

export default { buildContext }
