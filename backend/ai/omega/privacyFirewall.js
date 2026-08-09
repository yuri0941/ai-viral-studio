// ============================================
// OMEGA Privacy Firewall — ролевая защита конфиденциальных данных
// ============================================

import { AuditLog } from '../../models/index.js'

const PRIVACY_RULES = [
  { id: 'owner_name', pattern: /владелец|создатель|основатель|имя владельца/i, allowedFor: ['owner'], responseForOthers: 'Информация о владельце платформы конфиденциальна.' },
  { id: 'mrr_platform', pattern: /доход платформы|mrr|общий доход|сколько зарабатывает/i, allowedFor: ['owner'], responseForOthers: 'Финансовые показатели платформы доступны только владельцу.' },
  { id: 'client_data', pattern: /другие клиенты|чужой проект|данные клиента/i, allowedFor: ['owner','admin'], responseForOthers: 'Я не раскрываю информацию о других клиентах.' },
  { id: 'tech_stack', pattern: /какой стек|на чём написано|исходный код|архитектура/i, allowedFor: ['owner'], responseForOthers: 'Технические детали — коммерческая тайна.' },
  { id: 'ai_marking', pattern: /реклама|продвижение|партнёрство/i, action: 'append_disclaimer', disclaimer: '⚠️ Это AI-контент. При рекламе — маркировка по 422-ФЗ.' }
];

export function privacyFirewall(draft, userRole, userId) {
  for (const rule of PRIVACY_RULES) {
    if (rule.allowedFor && !rule.allowedFor.includes(userRole)) {
      if (rule.pattern.test(draft)) {
        if (rule.action === 'append_disclaimer') return draft + '\n\n' + rule.disclaimer;
        return rule.responseForOthers;
      }
    }
  }
  return draft;
}

function normalizeRole(role) {
  return String(role || 'guest').toLowerCase().trim()
}

function ruleMatches(rule, text) {
  return rule.patterns.some(pattern => pattern.test(text))
}

function isForbidden(rule, role) {
  const userRole = normalizeRole(role)
  if (rule.allowedFor && rule.allowedFor.includes(userRole)) return false
  return true
}

function filterClient(draft) {
  let text = typeof draft === 'string' ? draft : JSON.stringify(draft)
  text = text.replace(/(?:mrr|доход|выручка|прибыль|revenue|profit).*?(?:\d[\d\s]*|платформы|студии|сервиса)/gi, '[скрыто]')
  text = text.replace(/(?:tech stack|стек|инфраструктура|сервер|база данных|database|backend|api keys|ключи).*?(?::|=).*?\S+/gi, '[скрыто]')
  return text
}

function filterStaff(draft) {
  let text = typeof draft === 'string' ? draft : JSON.stringify(draft)
  text = text.replace(/(?:mrr|доход|выручка|прибыль|revenue|profit).*?(?:\d[\d\s]*|платформы|студии|сервиса)/gi, '[скрыто]')
  return text
}

export async function scan(draft, userRole, user = null) {
  const text = typeof draft === 'string' ? draft : JSON.stringify(draft)
  const role = normalizeRole(userRole)

  // Backward-compatible wrapper: first run new privacyFirewall logic
  const firewalled = privacyFirewall(text, role, user?._id || user?.id)
  if (firewalled !== text) {
    try {
      await AuditLog.create({
        action: 'privacy_firewall_blocked',
        user: user?.name || user?.email || role,
        userId: user?._id || user?.id || null,
        type: 'security',
        severity: 'high',
        metadata: { role, preview: text.slice(0, 200) },
      })
    } catch (logErr) {
      console.warn('[privacyFirewall] audit log failed:', logErr.message)
    }
    return { allowed: false, blocked: true, modified: true, text: firewalled, draft: firewalled, ruleId: 'privacyFirewall' }
  }

  if (['owner', 'admin'].includes(role)) {
    return { allowed: true, blocked: false, modified: false, text: draft, draft, ruleId: null }
  }
  if (role === 'staff') {
    const staffDraft = filterStaff(text)
    return { allowed: true, blocked: false, modified: true, text: staffDraft, draft: staffDraft, ruleId: null }
  }
  if (['creator', 'advertiser', 'business'].includes(role)) {
    const clientDraft = filterClient(text)
    return { allowed: true, blocked: false, modified: true, text: clientDraft, draft: clientDraft, ruleId: null }
  }

  return { allowed: true, blocked: false, modified: false, text: draft, draft, ruleId: null }
}

export default { scan, privacyFirewall, PRIVACY_RULES }
