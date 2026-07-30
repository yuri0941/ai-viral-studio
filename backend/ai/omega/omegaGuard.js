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

export function checkOmegaGuard(message, lang = 'ru') {
  const text = String(message || '').toLowerCase()
  const patterns = FORBIDDEN_PATTERNS[lang] || FORBIDDEN_PATTERNS.ru
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
