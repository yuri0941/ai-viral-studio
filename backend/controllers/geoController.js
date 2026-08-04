export const detectCurrency = (req, res) => {
    const country = req.headers['cf-ipcountry'] || req.query.country || 'RU'
    const map = {
        RU: { currency: 'RUB', symbol: '₽', payment: 'yookassa', locale: 'ru-RU' },
        KZ: { currency: 'RUB', symbol: '₽', payment: 'yookassa', locale: 'ru-RU' },
        BY: { currency: 'RUB', symbol: '₽', payment: 'yookassa', locale: 'ru-RU' },
        UA: { currency: 'UAH', symbol: '₴', payment: 'paypal', locale: 'uk-UA' },
        US: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'en-US' },
        CA: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'en-US' },
        GB: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'en-GB' },
        DE: { currency: 'EUR', symbol: '€', payment: 'stripe', locale: 'de-DE' },
        FR: { currency: 'EUR', symbol: '€', payment: 'stripe', locale: 'fr-FR' },
        ES: { currency: 'EUR', symbol: '€', payment: 'stripe', locale: 'es-ES' },
        IT: { currency: 'EUR', symbol: '€', payment: 'stripe', locale: 'it-IT' },
        PL: { currency: 'EUR', symbol: '€', payment: 'stripe', locale: 'pl-PL' },
        TR: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'tr-TR' },
        IN: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'en-IN' },
        BR: { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'pt-BR' }
    }
    res.json(map[country] || { currency: 'USD', symbol: '$', payment: 'stripe', locale: 'en-US' })
}

// [PAYMENT-v5.2] added
