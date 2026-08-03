// [P24] added: geo-currency detection and payment methods

const COUNTRY_CURRENCY_MAP = {
  RU: 'RUB',
  US: 'USD',
  EU: 'EUR',
  GB: 'GBP',
  UA: 'UAH',
  KZ: 'KZT',
  BY: 'BYN',
}

function detectCountryByIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return 'RU'
  // Simple heuristic from private ranges; production should use geo-ip service
  const privateRanges = [
    /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
    /^127\./, /^::1$/, /^fc00:/i, /^fe80:/i,
  ]
  if (privateRanges.some(r => r.test(ip))) return 'RU'
  return null
}

function detectCurrencyByIP(ip) {
  const country = detectCountryByIP(ip)
  return (country && COUNTRY_CURRENCY_MAP[country]) || 'USD'
}

function getPaymentMethods(country, currency) {
  const methods = []
  if (country === 'RU' || currency === 'RUB') {
    methods.push({ id: 'yookassa', name: 'Банковская карта / ЮKassa', icon: 'card' })
  }
  methods.push({ id: 'stripe', name: 'Stripe (Visa/Mastercard)', icon: 'stripe' })
  methods.push({ id: 'paypal', name: 'PayPal', icon: 'paypal' })
  methods.push({ id: 'crypto', name: 'Крипта (USDT/BTC/ETH)', icon: 'crypto' })
  return methods
}

export { detectCountryByIP, detectCurrencyByIP, getPaymentMethods }
