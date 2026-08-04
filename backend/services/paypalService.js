export const createPayPalOrder = async ({ planId, amount, currency = 'USD' }) => {
    if (!process.env.PAYPAL_CLIENT_ID) {
        return { url: null, provider: 'paypal', message: 'PayPal not configured yet' }
    }
    // [PAYMENT-v5.2] added: stub — replace with PayPal SDK integration when keys available
    return { url: 'https://www.paypal.com/checkout', orderId: 'mock', provider: 'paypal' }
}

// [PAYMENT-v5.2] added