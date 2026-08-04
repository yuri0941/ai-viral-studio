// [MONETIZE-2026-08-04] added unified plans
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceRUB: 0,
    priceUSD: 0,
    generations: 10,
    socials: 1,
    projects: 1,
    team: 1,
    features: ['10 AI-генераций', '1 соцсеть', 'Базовый планировщик']
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    priceRUB: 2900,
    priceUSD: 29,
    generations: 100,
    socials: 3,
    projects: 2,
    team: 1,
    features: ['100 AI-генераций', '3 соцсети', '50 шаблонов', 'Анализ контента']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceRUB: 7900,
    priceUSD: 79,
    generations: 500,
    socials: 5,
    projects: 5,
    team: 3,
    features: ['500 AI-генераций', '5 соцсетей', 'AI-обложки', 'A/B тесты', 'Brand Voice']
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceRUB: 19900,
    priceUSD: 199,
    generations: 5000,
    socials: 10,
    projects: 20,
    team: 10,
    features: ['5000 AI-генераций', '10 соцсетей', 'White-label', 'API доступ', 'Team seats']
  }
};

export const getPrice = (planId, currency = 'RUB') => {
  const plan = PLANS[planId];
  if (!plan) return 0;
  return currency === 'USD' ? plan.priceUSD : plan.priceRUB;
};

// [MASTER-v5.0] added: alias used by subscriptionController
export const getPlanPrice = getPrice;

export default PLANS;
