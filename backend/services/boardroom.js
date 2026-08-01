import { chatWithAI } from './aiService.js'

const AGENTS = [
    {
        id: 'ceo',
        name: 'OMEGA-CEO',
        role: 'Chief Executive Officer',
        focus: 'стратегия, ROI, риски',
        avatar: '👔',
        systemPrompt: 'Ты — стратегический CEO. Оценивай идею с точки зрения ROI, рыночных рисков, конкурентного преимущества и долгосрочного видения. Будь лаконичен, 1-2 предложения.',
    },
    {
        id: 'cmo',
        name: 'OMEGA-CMO',
        role: 'Chief Marketing Officer',
        focus: 'маркетинг, вирусность, бренд',
        avatar: '📢',
        systemPrompt: 'Ты — креативный CMO. Оценивай маркетинговый потенциал, вирусность, позиционирование и привлечение аудитории. Будь лаконичен, 1-2 предложения.',
    },
    {
        id: 'cto',
        name: 'OMEGA-CTO',
        role: 'Chief Technology Officer',
        focus: 'технология, инфраструктура, масштаб',
        avatar: '⚙️',
        systemPrompt: 'Ты — технический CTO. Оценивай реализуемость, технические риски, необходимую инфраструктуру и масштабируемость. Будь лаконичен, 1-2 предложения.',
    },
    {
        id: 'cfo',
        name: 'OMEGA-CFO',
        role: 'Chief Financial Officer',
        focus: 'финансы, инвестиции, кэш-флоу',
        avatar: '💰',
        systemPrompt: 'Ты — финансовый CFO. Оценивай инвестиции, юнит-экономику, кэш-флоу и финансовые риски. Будь лаконичен, 1-2 предложения.',
    },
    {
        id: 'chro',
        name: 'OMEGA-CHRO',
        role: 'Chief Human Resources Officer',
        focus: 'команда, найм, мотивация',
        avatar: '🤝',
        systemPrompt: 'Ты — HR-директор CHRO. Оценивай потребность в команде, найме, мотивации и корпоративной культуре. Будь лаконичен, 1-2 предложения.',
    },
]

function buildPrompt(agent, question, category, round, history = []) {
    const context = history.length
        ? `\nПредыдущие аргументы:\n${history.map(h => `${h.agent}: ${h.text}`).join('\n')}`
        : ''
    const roundInstruction = round === 1
        ? 'Сформулируй свой основной аргумент по вопросу.'
        : round === 2
            ? 'Отреагируй на аргументы коллег: укажи, с чем согласен/несогласен и почему.'
            : 'Сделай финальное заключение и чётко сформулируй свою позицию.'

    return `${agent.systemPrompt}

Вопрос для совета директоров: "${question}"
Категория: ${category}.
${roundInstruction}${context}

Ответь одним коротким аргументом на русском.`
}

async function generateAgentArgument(agent, question, category, round, history) {
    const prompt = buildPrompt(agent, question, category, round, history)
    try {
        const res = await chatWithAI(prompt, [], 'ru')
        const text = res?.reply || res?.content || `[${agent.name}] не удалось получить ответ`
        return { agent: agent.id, text: text.trim() }
    } catch (err) {
        console.error(`[boardroom] ${agent.name} failed:`, err.message)
        return { agent: agent.id, text: `[${agent.name}] аргумент недоступен` }
    }
}

function parseVote(text) {
    const lower = text.toLowerCase()
    if (lower.includes('за') || lower.includes('делать') || lower.includes('поддерж') || lower.includes('yes')) return 'for'
    if (lower.includes('против') || lower.includes('не делать') || lower.includes('отклон') || lower.includes('no')) return 'against'
    return 'abstain'
}

async function runVotingRound(question, category, finalArguments) {
    const votes = []
    for (const agent of AGENTS) {
        const prompt = `${agent.systemPrompt}

Вопрос: "${question}" (категория: ${category}).
Вот итоговые аргументы всех агентов:
${finalArguments.map(a => `- ${a.agent}: ${a.text}`).join('\n')}

Проголосуй: ЗА / ПРОТИВ / ВОЗДЕРЖАЛСЯ. Дай ТОЛЬКО один из этих трёх вариантов.`
        try {
            const res = await chatWithAI(prompt, [], 'ru')
            const text = res?.reply || res?.content || 'ВОЗДЕРЖАЛСЯ'
            votes.push({ agent: agent.id, vote: parseVote(text), text: text.trim() })
        } catch (err) {
            votes.push({ agent: agent.id, vote: 'abstain', text: 'ВОЗДЕРЖАЛСЯ' })
        }
    }
    return votes
}

export async function runBoardroom(question, category = 'стратегия') {
    if (!question?.trim()) {
        return { status: 'error', message: 'question is required' }
    }

    const rounds = []
    let history = []

    for (let round = 1; round <= 3; round++) {
        const roundArguments = []
        for (const agent of AGENTS) {
            const arg = await generateAgentArgument(agent, question, category, round, history)
            roundArguments.push({ ...arg, agentName: agent.name, agentRole: agent.role, avatar: agent.avatar })
        }
        rounds.push({ round, arguments: roundArguments })
        history = [...history, ...roundArguments.map(a => ({ agent: a.agentName, text: a.text }))]
    }

    const finalArguments = rounds[rounds.length - 1].arguments
    const votes = await runVotingRound(question, category, finalArguments)

    const forCount = votes.filter(v => v.vote === 'for').length
    const againstCount = votes.filter(v => v.vote === 'against').length
    const abstainCount = votes.filter(v => v.vote === 'abstain').length

    let recommendation = 'Воздержаться'
    if (forCount >= 4) recommendation = 'Делать'
    else if (againstCount >= 3) recommendation = 'Не делать'

    const summaryPrompt = `Ты — нейтральный секретарь совета директоров. Вопрос: "${question}".
Аргументы:
${finalArguments.map(a => `- ${a.agentName}: ${a.text}`).join('\n')}

Голоса: ${forCount} ЗА, ${againstCount} ПРОТИВ, ${abstainCount} воздержались. Рекомендация: ${recommendation}.

Сформируй краткую сводку: ключевые риски, бюджетные соображения, сроки и финальная рекомендация. Ответь на русском, 3-5 пунктов.`

    let summary = ''
    try {
        const res = await chatWithAI(summaryPrompt, [], 'ru')
        summary = res?.reply || res?.content || 'Сводка недоступна'
    } catch (err) {
        summary = 'Сводка недоступна'
    }

    return {
        status: 'ok',
        question,
        category,
        agents: AGENTS,
        rounds,
        votes,
        voteCounts: { for: forCount, against: againstCount, abstain: abstainCount },
        recommendation,
        summary,
    }
}

export default { runBoardroom, AGENTS }
