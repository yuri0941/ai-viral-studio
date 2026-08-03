export const PLANS = [
  { id: 'free', name: 'Free', priceRUB: 0, priceUSD: 0, features: ['1 проект', 'Базовая аналитика', 'Email поддержка'] },
  { id: 'starter', name: 'Starter', priceRUB: 2900, priceUSD: 29, features: ['3 проекта', 'Расширенная аналитика', 'Email поддержка'] },
  { id: 'creator', name: 'Creator', priceRUB: 4300, priceUSD: 43, features: ['5 проектов', 'AI генерация идей', 'Приоритетная поддержка'] },
  { id: 'pro', name: 'Pro', priceRUB: 7900, priceUSD: 79, features: ['20 проектов', 'API доступ', 'Расширенный AI'] },
  { id: 'agency', name: 'Agency', priceRUB: 19900, priceUSD: 143, features: ['Безлимит проектов', 'White label', 'Выделенный менеджер'] },
  { id: 'enterprise', name: 'Enterprise', priceRUB: 47500, priceUSD: 475, features: ['Кастом решения', 'On-premise', 'SLA 99.9%'] }
];

export function getPrice(plan, currency) {
  if (currency === 'USD') return plan.priceUSD;
  if (currency === 'RUB') return plan.priceRUB;
  return plan.priceRUB;
} // [P24] fixed: unified plans config
