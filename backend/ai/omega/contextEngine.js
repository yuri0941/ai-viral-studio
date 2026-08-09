// ============================================
// OMEGA Context Engine — ролевая фильтрация контекста
// ============================================

import User from '../../models/User.js'

const ROLE_INSTRUCTIONS = {
  owner: `Ты OMEGA — управляющий AI владельца платформы AI Viral Studio (ID: 2130452126). Ты НЕ продаёшь. Ты НЕ предлагаешь тарифы. Ты выполняешь команды, показываешь метрики, управляешь агентами, анализируешь данные, создаёшь проекты, редактируешь код. У тебя полный доступ. Отвечай кратко, по делу, с цифрами. Каждый ответ содержит actionable item.`,
  admin: `Ты OMEGA — AI-ассистент администратора. Помогаешь с модерацией, пользователями, настройками. Не показывай финансы платформы.`,
  staff: `Ты OMEGA — AI-ассистент поддержки. Помогаешь с тикетами, базой знаний. Доступ только к назначенным задачам.`,
  advertiser: `Ты OMEGA — AI-ассистент рекламодателя. Помогаешь с кампаниями, креативами, аналитикой.`,
  creator: `Ты OMEGA — AI-ассистент креатора. Помогаешь с постами, хуками, вирусностью. Мотивируй и вдохновляй.`,
  business: `Ты OMEGA — AI-ассистент бизнеса. Помогаешь с контент-планом, аналитикой, ростом.`,
  client: `Ты OMEGA — AI-ассистент клиента. Помогаешь с SMM, контентом, вирусностью. Мягко продаёшь: каждый ответ заканчивается релевантным CTA. Дружелюбный, энергичный, эмодзи. Если клиент хочет отменить/удалить — активируй Churn Guard. Если не знаешь ответ или баг — создай тикет.`,
  guest: `Ты OMEGA — AI-ассистент гостя. Отвечай на общие вопросы, не раскрывай конфиденциальные данные.`
};

const ACCESS_MATRIX = {
  owner: { canSee: ['all'], canModify: ['all'], cannotSee: [] },
  admin: { canSee: ['users','moderation','settings'], canModify: ['users','settings'], cannotSee: ['owner_finance','mrr_platform'] },
  staff: { canSee: ['assigned_tickets','kb'], canModify: ['assigned_tickets'], cannotSee: ['finance','strategy','other_staff'] },
  advertiser: { canSee: ['campaigns','creatives','analytics'], canModify: ['campaigns'], cannotSee: ['other_advertisers','platform_mrr'] },
  creator: { canSee: ['own_posts','own_analytics','templates'], canModify: ['own_content'], cannotSee: ['other_clients','mrr','tech_stack'] },
  business: { canSee: ['own_posts','own_analytics','business_spawner'], canModify: ['own_content'], cannotSee: ['other_clients','mrr'] },
  client: { canSee: ['own_data','public_info','pricing'], canModify: ['own_content'], cannotSee: ['mrr','other_clients','server_costs','tech_stack','owner_data'] },
  guest: { canSee: ['public_info'], canModify: [], cannotSee: ['all_private'] }
};

export { ROLE_INSTRUCTIONS, ACCESS_MATRIX };

export function getRoleInfo(role) {
  return ACCESS_MATRIX[role?.toLowerCase()] || ACCESS_MATRIX.guest
}

export function canAccess(role, resourceType) {
  const info = getRoleInfo(role)
  if (info.canSee.includes('all')) return true
  return info.canSee.includes(resourceType)
}

export function canModify(role, resourceType) {
  const info = getRoleInfo(role)
  if (info.canModify.includes('all')) return true
  return info.canModify.includes(resourceType)
}

export function canSee(role, resourceType) {
  return canAccess(role, resourceType)
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

  const allowedReads = info.canSee.filter(r => r !== 'all').join(', ') || 'public_info'
  const systemPrompt = `${ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.client}

Ты OMEGA, AI-ассистент AI Viral Studio. Пользователь — ${info.label || 'гость'} (${role}). Отвечай на языке запроса пользователя. Если запрос на русском — отвечай на русском. Если на английском — отвечай на английском. Не переключай язык без причины.

Контекст:
- Роль: ${role}
- Проект: ${projectName}
- Доступные данные: ${allowedReads}
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

export default { getContext, filterData, canAccess, canModify, canSee, getRoleInfo, ACCESS_MATRIX, ROLE_INSTRUCTIONS }
