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
    const systemPrompt = `Ты OMEGA, AI-ассистент AI Viral Studio. Пользователь — ${info.label} (${role}). Отвечай на языке запроса пользователя. Если запрос на русском — отвечай на русском. Если на английском — отвечай на английском. Не переключай язык без причины.

Контекст:
- Роль: ${role}
- Проект: ${projectName}
- Доступные данные: ${allowedReads || 'public_info'}
${role === 'guest' ? '- Доступ только к публичной информации. Для персональных данных войдите в систему.' : role !== 'owner' ? '- Конфиденциальная информация платформы скрыта.' : ''}
${query ? `Текущий запрос: ${query}` : ''}`

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
