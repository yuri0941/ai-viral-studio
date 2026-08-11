import { getProviderKey } from './aiService.js'

// [v9.9.19.14.5] real availability: disabled if keys are missing; reason shown in UI
export async function getPaymentMethods(country, currency) {
  const isRub = currency === 'RUB' || country === 'RU'

  const yookassaEnabled = !!(await getProviderKey('yookassa_shop_id')) && !!(await getProviderKey('yookassa_secret'))
  const stripeEnabled = !!(await getProviderKey('stripe'))
  const paypalEnabled = !!(await getProviderKey('paypal_client_id')) && !!(await getProviderKey('paypal_secret'))
  const coinbaseEnabled = !!process.env.COINBASE_API_KEY

  const methods = []

  if (isRub) {
    methods.push({
      id: 'yookassa',
      name: 'Банковская карта / ЮKassa',
      icon: 'card',
      enabled: yookassaEnabled,
      reason: yookassaEnabled ? null : 'Не настроено: Кабинет → API Ключи → yookassa_shop_id + yookassa_secret',
      recommended: true,
    })
  }

  methods.push({
    id: 'stripe',
    name: 'Stripe (Visa/Mastercard)',
    icon: 'stripe',
    enabled: stripeEnabled,
    reason: stripeEnabled ? null : 'Не настроено: Кабинет → API Ключи → stripe',
    recommended: !isRub,
  })

  methods.push({
    id: 'paypal',
    name: 'PayPal',
    icon: 'paypal',
    enabled: paypalEnabled,
    reason: paypalEnabled ? null : 'Не настроено: Кабинет → API Ключи → paypal_client_id + paypal_secret',
  })

  methods.push({
    id: 'crypto',
    name: 'Крипта (USDT/BTC/ETH)',
    icon: 'crypto',
    enabled: coinbaseEnabled,
    reason: coinbaseEnabled ? null : 'Не настроено: COINBASE_API_KEY на сервере',
  })

  return methods
}
