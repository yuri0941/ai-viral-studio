export const createCryptoInvoice = async ({ planId, amount, currency = 'USDT' }) => {
    const address = process.env.CRYPTO_ADDRESS
    if (!address) {
        return { address: null, provider: 'crypto', message: 'Crypto payments not configured' }
    }
    return {
        address,
        amount,
        currency,
        provider: 'crypto',
        message: `Отправьте ${amount} ${currency} на адрес ${address}`
    }
}

// [PAYMENT-v5.2] added