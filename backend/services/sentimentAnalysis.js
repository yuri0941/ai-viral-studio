const NEGATIVE_WORDS_RU = [
    'плохо', 'ужасно', 'отвратительно', 'ненавижу', 'ненависть', 'мерзко', 'гадость', 'тупой', 'идиот', 'дурак',
    'кончина', 'ублюдок', 'гнида', 'тварь', 'скотина', 'мразь', 'долбоеб', 'сука', 'блядь', 'хуй',
    'shit', 'fuck', 'hate', 'terrible', 'awful', 'disgusting', 'stupid', 'idiot', 'moron', 'trash',
    'обман', 'развод', 'кидалово', 'мошенники', 'шарага', 'крысы', 'жулики', 'кидалы', 'лохотрон',
    'никогда', 'худший', 'worst', 'never', 'scam', 'fraud', 'liar', 'fake', 'bullshit',
]

const POSITIVE_WORDS_RU = [
    'отлично', 'супер', 'круто', 'класс', 'люблю', 'обожаю', 'прекрасно', 'замечательно', 'восхитительно',
    'great', 'awesome', 'love', 'best', 'amazing', 'perfect', 'good', 'nice', 'thanks', 'thank',
]

export function analyzeSentiment(text) {
    if (!text) return { score: 50, label: 'neutral', confidence: 0 }
    const lower = text.toLowerCase()
    let negative = 0
    let positive = 0

    for (const word of NEGATIVE_WORDS_RU) {
        if (lower.includes(word)) negative += 1
    }
    for (const word of POSITIVE_WORDS_RU) {
        if (lower.includes(word)) positive += 1
    }

    const score = Math.max(0, Math.min(100, 50 - negative * 10 + positive * 10))
    let label = 'neutral'
    if (score < 40) label = 'negative'
    if (score < 25) label = 'very_negative'
    if (score > 60) label = 'positive'
    if (score > 75) label = 'very_positive'

    return { score, label, negative, positive }
}

export function analyzeBatch(comments = []) {
    return comments.map(c => {
        const text = typeof c === 'string' ? c : c.text
        const result = analyzeSentiment(text)
        return { text, ...result, author: c.author || 'anonymous', platform: c.platform || 'unknown' }
    })
}

export default { analyzeSentiment, analyzeBatch }
