import { chatWithAI, extractText, generateContent } from './aiService.js'
import { runBoardroom } from './boardroom.js'

function randomId() {
    return Math.random().toString(36).slice(2, 10)
}

import { isOwner } from '../utils/canUse.js'

export async function validateSpawning(user) {
    if (!user) return { ok: false, message: 'Пользователь не найден' }
    if (isOwner(user)) return { ok: true }
    const allowedSubscriptions = ['agency', 'enterprise', 'business']
    if (!allowedSubscriptions.includes(user.subscription)) {
        return { ok: false, message: 'Для создания бизнеса нужен Agency или Enterprise тариф' }
    }
    return { ok: true }
}

export async function spawnBusiness({ niche, budgetFrom, budgetTo, audience, city, userId, skipBoardroom = false }) {
    if (!niche?.trim()) return { status: 'error', message: 'niche is required' }

    const steps = []

    // Step 1: Boardroom consensus (unless skipped for demo/testing)
    let boardroom = null
    if (!skipBoardroom) {
        const question = `Открывать ли новое направление бизнеса в нише "${niche}" для аудитории "${audience || 'широкая аудитория'}" в городе ${city || 'online'} с бюджетом ${budgetFrom || '0'}–${budgetTo || '∞'}?`
        boardroom = await runBoardroom(question, 'стратегия')
        steps.push({
            id: 'boardroom',
            title: 'Совет директоров OMEGA',
            eta: '0-2ч',
            status: 'done',
            result: boardroom.recommendation,
        })
        if (boardroom.recommendation !== 'Делать') {
            return {
                status: 'rejected',
                message: `Совет директоров не одобрил идею: ${boardroom.recommendation}`,
                boardroom,
                steps,
            }
        }
    } else {
        steps.push({ id: 'boardroom', title: 'Совет директоров OMEGA', eta: '0-2ч', status: 'skipped', result: 'Пропущен (демо)' })
    }

    // Step 2: Niche research
    steps.push({ id: 'research', title: 'Исследование ниши', eta: '2-6ч', status: 'in_progress' })
    let research = ''
    try {
        const prompt = `Ты — аналитик рынка. Проведи краткое исследование ниши "${niche}" для города ${city || 'online'} и аудитории "${audience || 'широкая аудитория'}". Опиши тренды, конкурентов, спрос, риски и возможности. Ответь на русском, 5-7 пунктов.`
        const res = await chatWithAI(prompt, [], 'ru')
        research = extractText(res) || 'Исследование недоступно'
        steps.find(s => s.id === 'research').status = 'done'
        steps.find(s => s.id === 'research').result = research.slice(0, 500)
    } catch (err) {
        steps.find(s => s.id === 'research').status = 'error'
        steps.find(s => s.id === 'research').error = err.message
    }

    // Step 3: Brand generation
    steps.push({ id: 'brand', title: 'Бренд и айдентика', eta: '6-12ч', status: 'in_progress' })
    let brand = { name: '', tagline: '', colors: [], tone: '' }
    try {
        const prompt = `Ты — бренд-директор. Придумай название, слоган, цветовую палитру (3 hex-кода) и tone of voice для бизнеса в нише "${niche}" для аудитории "${audience || 'широкая аудитория'}" в городе ${city || 'online'}. Ответь ТОЛЬКО JSON: {name, tagline, colors: [hex1, hex2, hex3], tone, description}.`
        const res = await chatWithAI(prompt, [], 'ru')
        const text = extractText(res) || '{}'
        const match = text.match(/\{[\s\S]*\}/)
        brand = match ? JSON.parse(match[0]) : {}
        steps.find(s => s.id === 'brand').status = 'done'
        steps.find(s => s.id === 'brand').result = brand
    } catch (err) {
        steps.find(s => s.id === 'brand').status = 'error'
        steps.find(s => s.id === 'brand').error = err.message
    }

    // Step 4: Landing page
    steps.push({ id: 'landing', title: 'Лендинг', eta: '12-24ч', status: 'in_progress' })
    let landing = { html: '', description: '' }
    try {
        const prompt = `Ты — frontend-разработчик. Создай готовый одностраничный лендинг (HTML + встроенный CSS + небольшой JS) для бизнеса "${brand.name || niche}" в нише "${niche}". Используй цвета ${(brand.colors || []).join(', ')}. Лендинг должен быть адаптивным, современным, с хуком, преимуществами, CTA и контактами. Верни ТОЛЬКО полный HTML-код одной строкой или в виде {html: '...'}.`
        const res = await chatWithAI(prompt, [], 'ru')
        const text = extractText(res)
        const htmlMatch = text.match(/<html[\s\S]*<\/html>/i) || text.match(/<![\s\S]*<\/body>/i) || text.match(/<body[\s\S]*<\/body>/i)
        landing.html = htmlMatch ? htmlMatch[0] : `<html><body><h1>${brand.name || niche}</h1><p>${brand.tagline || ''}</p></body></html>`
        landing.description = `Лендинг для ${brand.name || niche}`
        steps.find(s => s.id === 'landing').status = 'done'
        steps.find(s => s.id === 'landing').result = 'HTML готов'
    } catch (err) {
        steps.find(s => s.id === 'landing').status = 'error'
        steps.find(s => s.id === 'landing').error = err.message
    }

    // Step 5: Payments setup
    steps.push({ id: 'payments', title: 'Тарифы и реквизиты', eta: '24-36ч', status: 'in_progress' })
    let payments = { tiers: [], note: '' }
    try {
        const prompt = `Ты — финансовый консультант. Предложи 3 тарифных плана для бизнеса "${brand.name || niche}" в нише "${niche}" с бюджетом ${budgetFrom || '0'}–${budgetTo || '∞'}. Ответь ТОЛЬКО JSON: {tiers: [{name, price, period, features: []}], note}.`
        const res = await chatWithAI(prompt, [], 'ru')
        const text = extractText(res) || '{}'
        const match = text.match(/\{[\s\S]*\}/)
        payments = match ? JSON.parse(match[0]) : payments
        payments.note = 'Для приёма платежей подключите ЮKassa/Stripe в настройках проекта.'
        steps.find(s => s.id === 'payments').status = 'done'
        steps.find(s => s.id === 'payments').result = payments
    } catch (err) {
        steps.find(s => s.id === 'payments').status = 'error'
        steps.find(s => s.id === 'payments').error = err.message
    }

    // Step 6: Content plan
    steps.push({ id: 'content', title: 'Контент-план', eta: '36-48ч', status: 'in_progress' })
    let contentPlan = []
    try {
        const prompt = `Ты — контент-стратег. Создай первые 10 постов для бизнеса "${brand.name || niche}" в нише "${niche}" для аудитории "${audience || 'широкая аудитория'}". Ответь ТОЛЬКО JSON: [{title, platform, type, hook, cta}].`
        const res = await chatWithAI(prompt, [], 'ru')
        const text = extractText(res) || '[]'
        const match = text.match(/\[[\s\S]*\]/)
        contentPlan = match ? JSON.parse(match[0]) : []
        steps.find(s => s.id === 'content').status = 'done'
        steps.find(s => s.id === 'content').result = `${contentPlan.length} постов`
    } catch (err) {
        steps.find(s => s.id === 'content').status = 'error'
        steps.find(s => s.id === 'content').error = err.message
    }

    const brandbook = {
        name: brand.name || `${niche} ${randomId().toUpperCase()}`,
        tagline: brand.tagline || '',
        colors: brand.colors || ['#8B5CF6', '#10B981', '#0F0F1A'],
        tone: brand.tone || 'Профессиональный, но дружелюбный',
        description: brand.description || `Бизнес в нише ${niche}`,
    }

    const instructions = `# Запуск проекта "${brandbook.name}"

1. Скачайте <landing.html> и загрузите на Cloudflare Pages / Netlify / Vercel.
2. Настройте домен и SSL.
3. Подключите платёжную систему (ЮKassa / Stripe) в Owner Dashboard.
4. Используйте <content-plan.json> для первых 10 постов.
5. Включите AutoPilot в OMEGA Core после подключения соцсетей.
6. Мониторьте метрики в Analytics.

Бюджет: ${budgetFrom || '0'}–${budgetTo || '∞'}
Аудитория: ${audience || 'широкая аудитория'}
Город: ${city || 'online'}
`

    return {
        status: 'ok',
        message: 'Бизнес рождён за 48 часов (симуляция)',
        brandbook,
        landing,
        payments,
        contentPlan,
        instructions,
        research,
        boardroom,
        steps,
    }
}

export default { validateSpawning, spawnBusiness }
