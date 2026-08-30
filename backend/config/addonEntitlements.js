// [ADDONS-COMPOSITION-LINK] Каталог реальных функций (entitlements), которые можно отдать аддоном.
// Белый список: ключ → подписи RU/EN + флаг implemented.
// implemented:false = «скоро» — витрина НЕ предлагает (в редакторе disabled, в продажу не уходит).
// Проверка доступа — через hasEntitlement (middleware/entitlement.js), НЕ через запись «куплено».

export const ADDON_ENTITLEMENTS = [
  { key: 'design.pack',       labelRu: 'Генерация обложек и баннеров',   labelEn: 'Cover & banner generation',   implemented: true },
  { key: 'video.shorts',      labelRu: 'Shorts/Reels из текста',         labelEn: 'Shorts/Reels from text',      implemented: true },
  { key: 'agents.extra10',    labelRu: '+10 агентов в Swarm',            labelEn: '+10 Swarm agents',            implemented: true },
  { key: 'analytics.pro',     labelRu: 'Глубокая аналитика и экспорт',   labelEn: 'Deep analytics & export',     implemented: true },
  { key: 'integrations.pro',  labelRu: 'WhatsApp, Slack, Notion',        labelEn: 'WhatsApp, Slack, Notion',     implemented: true },
  { key: 'whitelabel.brand',  labelRu: 'Скрыть бренд, свой логотип',     labelEn: 'White-label branding',        implemented: true },
  // запланированные — «скоро», продавать нельзя
  { key: 'autopilot.full',    labelRu: 'Полный автопилот кампаний',      labelEn: 'Full campaign autopilot',     implemented: false },
  { key: 'voice.dubbing',     labelRu: 'AI-дубляж голосом',              labelEn: 'AI voice dubbing',            implemented: false },
]

const BY_KEY = new Map(ADDON_ENTITLEMENTS.map(e => [e.key, e]))

export const isEntitlementKey = (k) => BY_KEY.has(k)
export const isImplemented = (k) => BY_KEY.get(k)?.implemented === true
export const entitlementLabel = (k, lang = 'ru') => {
  const e = BY_KEY.get(k)
  return e ? (lang === 'en' ? e.labelEn : e.labelRu) : k
}
