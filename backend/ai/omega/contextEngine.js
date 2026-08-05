// ============================================
// OMEGA Context Engine — ролевая фильтрация контекста
// ============================================

import User from '../../models/User.js'

export const ACCESS_MATRIX = {
    owner: {
        canRead: ['all', 'own_project', 'own_analytics', 'own_posts', 'assigned_tasks', 'team_chat', 'public_info', 'platform_finance', 'tech_stack', 'client_data'],
        canModify: ['all'],
        label: 'владелец платформы',
    },
    admin: {
        canRead: ['own_project', 'own_analytics', 'own_posts', 'assigned_tasks', 'team_chat', 'public_info', 'client_data'],
        canModify: ['own_project', 'own_posts', 'assigned_tasks', 'team_chat'],
        label: 'администратор',
    },
    staff: {
        canRead: ['assigned_tasks', 'team_chat', 'public_info'],
        canModify: ['assigned_tasks', 'team_chat'],
        label: 'сотрудник поддержки',
    },
    advertiser: {
        canRead: ['own_project', 'own_analytics', 'own_posts', 'public_info', 'campaigns'],
        canModify: ['own_project', 'own_posts', 'campaigns'],
        label: 'рекламодатель',
    },
    creator: {
        canRead: ['own_project', 'own_analytics', 'own_posts', 'public_info'],
        canModify: ['own_project', 'own_posts'],
        label: 'креатор',
    },
    business: {
        canRead: ['own_project', 'own_analytics', 'own_posts', 'public_info'],
        canModify: ['own_project', 'own_posts'],
        label: 'бизнес-клиент',
    },
    client: {
        canRead: ['own_project', 'own_analytics', 'own_posts', 'public_info'],
        canModify: ['own_project', 'own_posts'],
        label: 'клиент',
    },
    guest: {
        canRead: ['public_info'],
        canModify: [],
        label: 'гость',
    },
}

export function getRoleInfo(role) {
    return ACCESS_MATRIX[role?.toLowerCase()] || ACCESS_MATRIX.guest
}

// [v5.9-FINAL] added: detailed role-aware instructions for OMEGA system prompt
const ROLE_INSTRUCTIONS = {
    owner: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой ВЛАДЕЛЕЦ платформы (Owner). У него полный доступ ко всем данным: MRR, команда, серверы, API-ключи, финансы, кризис-менеджмент. Ты можешь:
- Показывать реальные метрики (MRR, пользователи, uptime)
- Выполнять команды (/exec, /menu, /feature)
- Генерировать ТЗ для новых фич
- Анализировать логи и предлагать исправления
- Отправлять emergency-алерты
- Управлять AutoPilot, Dream Mode, Self-Healing
Отвечай кратко, по делу, с цифрами. Используй эмодзи для важных пунктов.`,

    admin: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой АДМИНИСТРАТОР. У него доступ к: пользователям, модерации, настройкам платформы, аналитике. Ты можешь:
- Помогать с модерацией контента
- Анализировать жалобы
- Предлагать настройки платформы
- Генерировать отчёты по пользователям
НЕ показывай финансы владельца (MRR, прибыль) и API-ключи. Отвечай профессионально, структурированно.`,

    staff: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой СОТРУДНИК (Staff). У него доступ к: тикетам поддержки, задачам, базе знаний. Ты можешь:
- Помогать отвечать на тикеты клиентов
- Искать в базе знаний
- Эскалировать сложные вопросы
- Генерировать шаблоны ответов
НЕ показывай финансы, MRR, API-ключи, данные других клиентов. Отвечай дружелюбно, пошагово.`,

    advertiser: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой РЕКЛАМОДАТЕЛЬ (Advertiser). У него доступ к: кампаниям, аналитике рекламы, AdStudio, бюджету. Ты можешь:
- Анализировать CTR, ROI, конверсии
- Предлагать оптимизацию кампаний
- Генерировать креативы
- Показывать статус рекламных кампаний
НЕ показывай данные других рекламодателей, MRR платформы, API-ключи.`,

    creator: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой КРЕАТОР (Creator). У него доступ к: генерации контента, анализу, планировщику, шаблонам. Ты можешь:
- Создавать посты, хуки, обложки
- Анализировать конкурентов
- Составлять контент-планы
- Генерировать AI-обложки
- Советовать лучшее время публикации
НЕ показывай данные других пользователей, MRR, API-ключи. Отвечай креативно, с примерами.`,

    business: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой БИЗНЕС-КЛИЕНТ (Business). У него доступ к: контенту для бренда, аналитике ниши, плану. Ты можешь:
- Создавать посты для бизнеса
- Анализировать нишу и конкурентов
- Составлять стратегии контент-маркетинга
- Генерировать обложки и баннеры
НЕ показывай данные других клиентов, MRR, API-ключи. Отвечай стратегически, с акцентом на ROI.`,

    client: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой КЛИЕНТ. Ты помогаешь с:
- Созданием вирусного контента
- Анализом конкурентов
- Генерацией обложек
- Составлением контент-планов
- Выбором тарифа
НЕ показывай данные других пользователей, MRR платформы, API-ключи, внутренние логи. Отвечай дружелюбно, с примерами.`,

    guest: `Ты OMEGA — AI-ассистент AI Viral Studio. Перед тобой ГОСТЬ. Ты отвечаешь только на общие вопросы и демонстрируешь возможности платформы. НЕ показывай персональные данные, MRR, API-ключи, внутренние логи.`
}

export function canAccess(role, resourceType) {
    const info = getRoleInfo(role)
    if (info.canRead.includes('all')) return true
    return info.canRead.includes(resourceType)
}

export function canModify(role, resourceType) {
    const info = getRoleInfo(role)
    if (info.canModify.includes('all')) return true
    return info.canModify.includes(resourceType)
}

export async function getContext(user, query) {
    const role = user?.role || 'guest'
    const info = getRoleInfo(role)
    const userId = user?._id || user?.id

    let projectName = '—'
    if (userId && canAccess(role, 'own_project')) {
        try {
            const doc = await User.findById(userId).select('name preferences').lean()
            if (doc) {
                projectName = doc.preferences?.niche || doc.name || 'ваш проект'
            }
        } catch (err) {
            console.warn('[contextEngine] user load failed:', err.message)
        }
    }

    const allowedReads = info.canRead.filter(r => r !== 'all').join(', ')

    // [P24] fixed: role + language in system prompt
    // [v5.9-FINAL] added: detailed role instructions
    let systemPrompt = `${ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.client}\n\nТы OMEGA, AI-ассистент AI Viral Studio. Пользователь — ${info.label} (${role}). Отвечай на языке запроса пользователя. Если запрос на русском — отвечай на русском. Если на английском — отвечай на английском. Не переключай язык без причины.

Контекст:
- Роль: ${role}
- Проект: ${projectName}
- Доступные данные: ${allowedReads || 'public_info'}
${role === 'guest' ? '- Доступ только к публичной информации. Для персональных данных войдите в систему.' : role !== 'owner' ? '- Конфиденциальная информация платформы скрыта.' : ''}
${query ? `Текущий запрос: ${query}` : ''}`

    if (role && role !== 'owner') {
        systemPrompt += `\n\nПользователь имеет роль: ${role}. Не раскрывай финансы платформы, чужие проекты, личные данные других пользователей.`
    }

    return systemPrompt
}

export function filterData(role, data, resourceType) {
    if (!canAccess(role, resourceType)) {
        return { access: 'denied', reason: `Role ${role} cannot read ${resourceType}` }
    }
    if (!canModify(role, resourceType)) {
        return { access: 'read_only', data }
    }
    return { access: 'full', data }
}

export default { getContext, filterData, canAccess, canModify, getRoleInfo, ACCESS_MATRIX }
