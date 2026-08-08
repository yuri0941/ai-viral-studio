let PRICING = {
  '1/24': { price: 5000, description: 'Пост 24 часа' },
  '1/48': { price: 8000, description: 'Пост 48 часов' },
  forever: { price: 15000, description: 'Пост навсегда' },
  story: { price: 3000, description: 'Stories / ephemeral' },
  native: { price: 10000, description: 'Нативная интеграция' }
};

export function getAdPricing() {
  return PRICING;
}

export function updateAdPricing(slotType, newPrice, currency = 'RUB') {
  if (PRICING[slotType]) {
    PRICING[slotType].price = newPrice;
    PRICING[slotType].currency = currency;
  }
  return PRICING;
}

export function calculatePrice(slotType, niche, urgency = false) {
  const base = PRICING[slotType]?.price || 5000;
  const mult = { beauty: 1.2, it: 1.5, crypto: 2.0, general: 1.0 }[niche] || 1.0;
  return Math.round(base * mult * (urgency ? 1.3 : 1));
}
