export function getPaymentMethods(country, currency) {
  const methods = [];
  if (country === 'RU' || currency === 'RUB') {
    methods.push({ id: 'yookassa', name: 'Банковская карта / ЮKassa', icon: 'card' });
  }
  methods.push({ id: 'stripe', name: 'Stripe (Visa/Mastercard)', icon: 'stripe' });
  methods.push({ id: 'paypal', name: 'PayPal', icon: 'paypal' });
  methods.push({ id: 'crypto', name: 'Крипта (USDT/BTC/ETH)', icon: 'crypto' });
  return methods;
} // [P24] fixed: payment methods
