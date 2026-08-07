import RoadmapItem from '../models/RoadmapItem.js'

const DEFAULT_6_MONTH_ROADMAP = [
    {
        month: 1,
        title: 'Стабилизация и первые клиенты',
        items: [
            { title: 'Финальные багфиксы production', priority: 'critical', risks: ['Регрессии после v7.0'], mitigation: ['E2E тесты перед каждым релизом'] },
            { title: 'Onboarding funnel v2', priority: 'high', risks: ['Высокий отток на шаге оплаты'], mitigation: ['A/B тесты форм, Stripe + YooKassa'] },
            { title: 'Привлечь первых 10 платящих клиентов', priority: 'high', risks: ['Нет маркетингового бюджета'], mitigation:['Реферальная программа + Founder personal outreach'] },
        ],
    },
    {
        month: 2,
        title: 'iOS приложение и AI-видео',
        items: [
            { title: 'Capacitor iOS сборка в App Store', priority: 'critical', risks: ['Требуется macOS/Apple Developer'], mitigation: ['Арендовать Mac Mini + Apple Developer account'] },
            { title: 'AI Видео: Shorts/Reels из текста', priority: 'high', risks: ['API видео дорогой'], mitigation: ['Использовать FFmpeg + Pollinations fallback'] },
            { title: 'Улучшить first-post success rate', priority: 'medium', risks: [], mitigation: [] },
        ],
    },
    {
        month: 3,
        title: 'Маркетплейс шаблонов и API',
        items: [
            { title: 'Template Marketplace', priority: 'high', risks: ['Модерация контента'], mitigation: ['Auto-moderation + community reports'] },
            { title: 'Public API v1 для разработчиков', priority: 'high', risks: ['Документация и rate limits'], mitigation: ['Swagger + API keys + quotas'] },
            { title: 'Affiliate dashboard v2', priority: 'medium', risks: [], mitigation: [] },
        ],
    },
    {
        month: 4,
        title: 'AI-аватар 3D и голос v2',
        items: [
            { title: '3D AI-аватар для брендов', priority: 'medium', risks: ['Требуется GPU/3D пайплайн'], mitigation: ['Интеграция ReadyPlayerMe + HeyGen'] },
            { title: 'Голосовой интерфейс v2', priority: 'medium', risks: ['Распознавание русского акцента'], mitigation: ['Whisper API fine-tune'] },
        ],
    },
    {
        month: 5,
        title: 'Blockchain/NFT интеграция',
        items: [
            { title: 'NFT-минтинг вирусных постов', priority: 'low', risks: ['Низкий спрос, юридические риски'], mitigation: ['Опрос пользователей, тестовый запуск'] },
            { title: 'Crypto payments', priority: 'low', risks: ['Регуляторика'], mitigation: ['Через сторонний шлюз'] },
        ],
    },
    {
        month: 6,
        title: 'Enterprise и White-label v2',
        items: [
            { title: 'Enterprise SSO + SLA', priority: 'high', risks: ['Долгие sales циклы'], mitigation: ['Пилот с 1-2 enterprise клиентами'] },
            { title: 'White-label v2 (CNAME, custom SMTP)', priority: 'high', risks: ['Сложность DNS/SMTP'], mitigation: ['Интеграция Cloudflare + Resend'] },
            { title: 'Франшиза AI Viral Studio', priority: 'medium', risks: ['Юридические договоры'], mitigation: ['Шаблоны договоров + юрист'] },
        ],
    },
]

export async function seedDefaultRoadmap() {
    const count = await RoadmapItem.countDocuments()
    if (count > 0) return

    const docs = []
    for (const month of DEFAULT_6_MONTH_ROADMAP) {
        for (const item of month.items) {
            docs.push({
                title: item.title,
                description: `${month.title}: ${item.title}`,
                phase: 'planned',
                priority: item.priority,
                eta: new Date(Date.now() + month.month * 30 * 24 * 60 * 60 * 1000),
                risks: item.risks,
                mitigation: item.mitigation,
                progress: 0,
                createdBy: 'OMEGA',
                approved: false,
                month: month.month,
            })
        }
    }
    await RoadmapItem.insertMany(docs)
}

export function analyzeRisks(items) {
    const warnings = []
    const critical = items.filter(i => i.priority === 'critical' && i.phase !== 'released')
    if (critical.length > 3) warnings.push(`Слишком много критичных задач (${critical.length}). Риски просрочки высокие.`)

    for (const item of items) {
        if (!item.risks?.length && item.priority === 'critical') warnings.push(`У задачи "${item.title}" нет рисков. Добавьте mitigation.`)
        if (item.dependencies?.length) {
            const missingDeps = item.dependencies.filter(dep => !items.some(i => i.title === dep || String(i._id) === dep))
            if (missingDeps.length) warnings.push(`Задача "${item.title}" зависит от несуществующих пунктов: ${missingDeps.join(', ')}`)
        }
        const eta = new Date(item.eta)
        if (eta < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && item.progress < 50) {
            warnings.push(`Задача "${item.title}" близка к ETA, но выполнена только на ${item.progress}%`)
        }
    }
    return warnings
}

export async function recalculateETAs(items) {
    const releasedCount = items.filter(i => i.phase === 'released').length
    const avgVelocity = releasedCount / Math.max(1, items.length / 6)
    for (const item of items) {
        if (item.phase === 'released') continue
        const needed = 100 - item.progress
        const weeks = Math.ceil(needed / Math.max(avgVelocity * 10, 1))
        item.eta = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000)
    }
    return items
}
