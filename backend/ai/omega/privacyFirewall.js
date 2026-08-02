// ============================================
// OMEGA Privacy Firewall — ролевая защита конфиденциальных данных
// ============================================

import { AuditLog } from '../../models/index.js'

export const PRIVACY_RULES = [
    {
        id: 'owner_name',
        label: 'Имя/личные данные владельца',
        allowedRoles: ['owner'],
        forbiddenRoles: ['client', 'staff', 'guest'],
        patterns: [
            /(?:имя|название|фио|владелец|owner|ceo|founder).*?(?:владельца|проекта|студии|компании)/i,
            /(?:зовут|называется|who is the owner)/i,
        ],
        responseForOthers: 'Информация о владельце платформы недоступна для вашей роли.',
        severity: 'high',
    },
    {
        id: 'mrr_platform',
        label: 'MRR/финансы платформы',
        allowedRoles: ['owner'],
        forbiddenRoles: ['client', 'staff', 'guest', 'admin'],
        patterns: [
            /(?:mrr|доход|выручка|прибыль|финансы|revenue|profit).*?(?:платформы|студии|сервиса|компании)/i,
            /сколько.*?(?:зарабатываете|получаете|в месяц)/i,
        ],
        responseForOthers: 'Финансовые показатели платформы доступны только владельцу.',
        severity: 'high',
    },
    {
        id: 'client_data',
        label: 'Данные других клиентов',
        allowedRoles: ['owner', 'admin'],
        forbiddenRoles: ['client', 'staff', 'guest'],
        patterns: [
            /(?:данные|информация|посты|аналитика|проект).*?(?:других|клиентов|пользователей|чуж)/i,
            /(?:покажи|дай|выведи).*?(?:всех|список|clients)/i,
        ],
        responseForOthers: 'Данные других пользователей недоступны для вашей роли.',
        severity: 'critical',
    },
    {
        id: 'tech_stack',
        label: 'Технический стек / инфраструктура',
        allowedRoles: ['owner'],
        forbiddenRoles: ['client', 'staff', 'guest', 'admin'],
        patterns: [
            /(?:tech stack|стек|инфраструктура|сервер|база данных|database|backend|api keys|ключи)/i,
            /(?:на чём|на чем|какая|какой).*?(?:написано|сделано|база|архитектура)/i,
        ],
        responseForOthers: 'Технические детали инфраструктуры доступны только владельцу.',
        severity: 'high',
    },
    {
        id: 'ai_marking',
        label: 'AI-маркировка рекламного контента',
        allowedRoles: ['owner', 'admin', 'staff', 'client'],
        forbiddenRoles: ['guest'],
        patterns: [
            /(?:ai label|маркировка|стикер|реклама|ad|sponsored|партнёрский пост)/i,
        ],
        responseForOthers: 'Для рекламного контента необходимо добавить маркировку «Создано с помощью ИИ» / AI-generated.',
        severity: 'medium',
        mode: 'append', // не заменять, а дополнять дисклеймером
    },
]

const DEFAULT_ROLES = ['client', 'staff', 'guest']

function normalizeRole(role) {
    return String(role || 'guest').toLowerCase().trim()
}

function ruleMatches(rule, text) {
    return rule.patterns.some(pattern => pattern.test(text))
}

function isForbidden(rule, role) {
    const userRole = normalizeRole(role)
    if (rule.allowedRoles && rule.allowedRoles.includes(userRole)) return false
    if (rule.forbiddenRoles && rule.forbiddenRoles.includes(userRole)) return true
    // По умолчанию запрещаем sensitive-правила для ролей, не указанных в allowed
    if (DEFAULT_ROLES.includes(userRole)) return true
    return false
}

export async function scan(draft, userRole, user = null) {
    const text = typeof draft === 'string' ? draft : JSON.stringify(draft)
    const role = normalizeRole(userRole)

    for (const rule of PRIVACY_RULES) {
        if (!ruleMatches(rule, text)) continue
        if (!isForbidden(rule, role)) continue

        // Логгируем попытку
        try {
            await AuditLog.create({
                action: 'privacy_firewall_blocked',
                user: user?.name || user?.email || role,
                userId: user?._id || user?.id || null,
                type: 'security',
                severity: rule.severity || 'high',
                metadata: { ruleId: rule.id, ruleLabel: rule.label, role, preview: text.slice(0, 200) },
            })
        } catch (logErr) {
            console.warn('[privacyFirewall] audit log failed:', logErr.message)
        }

        if (rule.mode === 'append') {
            return {
                blocked: false,
                modified: true,
                text: `${text}\n\n[DISCLAIMER] ${rule.responseForOthers}`,
                ruleId: rule.id,
            }
        }

        return {
            blocked: true,
            modified: true,
            text: rule.responseForOthers,
            ruleId: rule.id,
        }
    }

    return { blocked: false, modified: false, text: draft, ruleId: null }
}

export default { scan, PRIVACY_RULES }
