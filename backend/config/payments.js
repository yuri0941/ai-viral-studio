export const PAYMENT_PROVIDERS = {
    yookassa: {
        id: 'yookassa',
        name: 'ЮKassa',
        currencies: ['RUB'],
        isActive: !!process.env.YOOKASSA_SHOP_ID,
        testMode: process.env.NODE_ENV !== 'production'
    },
    stripe: {
        id: 'stripe',
        name: 'Stripe',
        currencies: ['USD', 'EUR', 'GBP'],
        isActive: !!process.env.STRIPE_SECRET_KEY,
        testMode: true
    },
    paypal: {
        id: 'paypal',
        name: 'PayPal',
        currencies: ['USD', 'EUR', 'GBP'],
        isActive: !!process.env.PAYPAL_CLIENT_ID,
        testMode: true
    },
    crypto: {
        id: 'crypto',
        name: 'Криптовалюта',
        currencies: ['USDT', 'BTC', 'ETH'],
        isActive: !!process.env.CRYPTO_ADDRESS,
        testMode: false
    }
}

export const getAvailableProviders = (currency) => {
    return Object.values(PAYMENT_PROVIDERS).filter(p =>
        p.isActive && (currency === 'ALL' || p.currencies.includes(currency))
    )
}

// [PAYMENT-v5.2] added
