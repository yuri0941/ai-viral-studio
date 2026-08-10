import { chatWithAI, extractText } from './aiService.js'

/**
 * Best Time to Post — AI-рекомендации лучшего времени публикации.
 */
const DEFAULT_TIMES = {
    instagram: ['19:00', '12:00', '21:00'],
    tiktok: ['19:00', '21:00', '12:00'],
    youtube: ['17:00', '14:00', '20:00'],
    youtube_shorts: ['19:00', '12:00', '21:00'],
    twitter: ['09:00', '12:00', '18:00'],
    telegram: ['12:00', '18:00', '21:00'],
    vk: ['15:00', '19:00', '21:00'],
}

function pickDefaultTime(platform) {
    const key = (platform || 'instagram').toLowerCase().replace(/[^a-z_]/g, '')
    const times = DEFAULT_TIMES[key] || DEFAULT_TIMES.instagram
    return times[0]
}

function parseTimeFromAI(text) {
    if (!text) return null
    // Match HH:MM (optional seconds)
    const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?/)
    if (match) {
        const h = match[1].padStart(2, '0')
        const m = match[2]
        return `${h}:${m}`
    }
    // Match "7 PM", "19:00", "7 вечера"
    const ampm = text.match(/(\d{1,2})\s*(AM|PM)/i)
    if (ampm) {
        let h = parseInt(ampm[1], 10)
        if (ampm[2].toUpperCase() === 'PM' && h < 12) h += 12
        if (ampm[2].toUpperCase() === 'AM' && h === 12) h = 0
        return `${String(h).padStart(2, '0')}:00`
    }
    return null
}

export async function analyzeBestTime({ platform, audienceTimezone = 'UTC', historicalPosts = [], niche = '' }) {
    const platformName = platform || 'instagram'
    const fallback = pickDefaultTime(platformName)

    const prompt = `Ты — SMM-аналитик. Пользователь публикует контент в ${platformName}${niche ? `, ниша: ${niche}` : ''}. Аудитория в часовом поясе ${audienceTimezone}.
${historicalPosts.length > 0 ? `Исторические публикации (UTC ISO): ${JSON.stringify(historicalPosts.slice(0, 10))}.` : 'Исторических данных нет.'}

Верни ТОЛЬКО JSON без Markdown:
{
  "bestTime": "HH:MM",
  "reason": "1-2 предложения",
  "alternativeTimes": ["HH:MM", "HH:MM"]
}

Лучшее время должно быть для часового пояса аудитории.`

    try {
        const result = await chatWithAI(prompt, [], 'ru')
        const text = extractText(result)
        let json = null
        try {
            json = JSON.parse(text)
        } catch {
            const match = text.match(/\{[\s\S]*\}/)
            if (match) json = JSON.parse(match[0])
        }

        if (json?.bestTime) {
            const parsed = parseTimeFromAI(json.bestTime) || fallback
            return {
                bestTime: parsed,
                reason: json.reason || `Пик активности аудитории ${platformName} — ${parsed}`,
                alternativeTimes: (json.alternativeTimes || []).map(t => parseTimeFromAI(t)).filter(Boolean),
                platform: platformName,
                timezone: audienceTimezone,
                source: 'ai',
            }
        }

        const parsedFallback = parseTimeFromAI(text) || fallback
        return {
            bestTime: parsedFallback,
            reason: `AI не вернул структуру. Используем дефолтное лучшее время для ${platformName}: ${parsedFallback}`,
            alternativeTimes: DEFAULT_TIMES[platformName] || [fallback],
            platform: platformName,
            timezone: audienceTimezone,
            source: 'fallback',
        }
    } catch (err) {
        console.warn('[bestTimeService] AI failed:', err.message)
        return {
            bestTime: fallback,
            reason: `AI недоступен. Дефолтное время для ${platformName}: ${fallback}`,
            alternativeTimes: DEFAULT_TIMES[platformName] || [fallback],
            platform: platformName,
            timezone: audienceTimezone,
            source: 'fallback',
        }
    }
}

export default { analyzeBestTime }
