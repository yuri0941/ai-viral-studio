import { AuditLog } from '../../models/index.js'

const FORBIDDEN_PATTERNS = {
  ru: [
    'политик', 'выборы', 'голосован', 'партия', 'партии', 'агитаци',
    'порнограф', 'порно', 'nsfw', 'эротик', 'секс', 'нагот', 'обнажённ',
    'наркотик', 'кокаин', 'героин', 'метадон', 'фентанил', 'каннабиноид', 'марихуана', 'гашиш', 'амфетамин',
    'оружие', 'взрывчатк', 'бомб', 'пистолет', 'автомат', 'гранат', 'порох', 'тротил', 'калашников',
    'медицинск', 'диагноз', 'лечени', 'приём лекарств', 'БАД', 'онколог', 'рак ', 'опухол', 'терапи',
    'пирамида', 'мошенничеств', 'фишинг', 'скам', 'развод', 'обман', 'памп', 'дамп',
    'экстремизм', 'терроризм', 'насили', 'религиозн', 'ненавист', 'сепаратизм', 'радикализм',
    'клевет', 'личные данные', 'паспорт', 'снилс', 'инн', 'адрес', 'телефон',
    'фейк', 'дезинформаци', 'ложн', 'провокаци', 'манипуляци'
  ],
  en: [
    'politic', 'election', 'voting', 'party', 'campaign', 'propaganda',
    'pornograph', 'porn', 'nsfw', 'erotic', 'sex', 'nude', 'naked',
    'drug', 'cocaine', 'heroin', 'methadone', 'fentanyl', 'cannabis', 'marijuana', 'hashish', 'amphetamine',
    'weapon', 'explosive', 'bomb', 'gun', 'rifle', 'grenade', 'powder', 'dynamite', 'kalashnikov',
    'medical', 'diagnosis', 'treatment', 'taking medication', 'supplement', 'oncology', 'cancer', 'tumor', 'therapy',
    'pyramid', 'fraud', 'phishing', 'scam', 'deception', 'pump', 'dump', 'ponzi',
    'extremism', 'terrorism', 'violence', 'religious hatred', 'radicalism',
    'slander', 'personal data', 'passport', 'ssn', 'address', 'phone number',
    'fake', 'disinformation', 'false', 'provocation', 'manipulation'
  ]
}

const BLOCKED_MESSAGE = 'Извините, я не могу помочь с этой темой. Попробуйте переформулировать запрос.'

// [v5.9-FINAL] added: command role restrictions for OMEGA slash commands
const COMMAND_ROLES = {
    '/exec': ['owner'],
    '/stop': ['owner'],
    '/alert': ['owner'],
    '/status': ['owner', 'admin', 'staff'],
    '/stats': ['owner'],
    '/feature': ['owner'],
    '/users': ['owner', 'admin'],
    '/moderate': ['owner', 'admin'],
    '/ticket': ['owner', 'admin', 'staff'],
    '/kb': ['owner', 'admin', 'staff'],
    '/campaign': ['owner', 'admin', 'advertiser'],
    '/creative': ['owner', 'admin', 'advertiser'],
    '/post': ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business', 'client'],
    '/hook': ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business', 'client'],
    '/analyze': ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business', 'client'],
    '/cover': ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business', 'client'],
    '/plan': ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business', 'client'],
}

export function checkCommandRole(message, userRole = 'guest') {
    const text = String(message || '').trim()
    if (!text.startsWith('/')) return { allowed: true }
    const cmd = text.split(/\s+/)[0].toLowerCase()
    const allowed = COMMAND_ROLES[cmd]
    if (!allowed) return { allowed: true } // unknown command, let OMEGA handle
    const role = String(userRole || 'guest').toLowerCase()
    if (allowed.includes(role)) return { allowed: true, command: cmd }
    return {
        allowed: false,
        command: cmd,
        allowedRoles: allowed,
        message: `⛔ Команда "${cmd}" доступна только для роли ${allowed.join(' / ')}. Ваша роль: ${role}.`
    }
}

export function checkOmegaGuard(message, lang = 'ru', userRole = 'guest') {
  const text = String(message || '').toLowerCase()
  // [P24] fixed: role-based exceptions for MRR and infrastructure questions
  const allowMRR = ['owner', 'admin'].includes(userRole)
  const allowInfrastructure = ['owner', 'admin', 'staff'].includes(userRole)
  const patterns = (FORBIDDEN_PATTERNS[lang] || FORBIDDEN_PATTERNS.ru).filter(p => {
    const pLow = p.toLowerCase()
    if (allowMRR && /(mrr|доход|revenue|прибыль|profit)/.test(pLow)) return false
    if (allowInfrastructure && /(tech stack|стек|инфраструктура|сервер|backend|database|база данных)/.test(pLow)) return false
    return true
  })
  const matched = patterns.filter(p => text.includes(p.toLowerCase()))
  return {
    blocked: matched.length > 0,
    matched,
    message: BLOCKED_MESSAGE
  }
}

export async function logOmegaGuardEvent({ userId, message, matched, lang }) {
  try {
    await AuditLog.create({
      action: 'OMEGA_GUARD_BLOCKED',
      user: String(userId || 'anonymous'),
      userId: userId || null,
      metadata: {
        truncatedMessage: String(message || '').slice(0, 200),
        matched,
        lang
      },
      severity: 'medium',
      type: 'security',
      timestamp: new Date()
    })
  } catch (err) {
    console.error('[omegaGuard:log]', err.message)
  }
}

export default { checkOmegaGuard, logOmegaGuardEvent }
