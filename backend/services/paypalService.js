export const createPayPalOrder = async ({ planId, amount, currency = 'USD', description, customId, returnUrl, cancelUrl }) => {
    if (!process.env.PAYPAL_CLIENT_ID) {
        return { url: null, provider: 'paypal', message: 'PayPal not configured yet' }
    }
    // [PAYMENT-v5.2] added: stub — replace with PayPal SDK integration when keys available
    return { url: 'https://www.paypal.com/checkout', orderId: 'mock-' + Date.now(), provider: 'paypal' }
}

// [HOTFIX-PAYPAL] added: mock capture + status exports
export const capturePayPalOrder = async (orderId) => {
    console.log('[PayPal] captureOrder mock:', orderId);
    return { id: orderId, status: 'COMPLETED', provider: 'paypal' };
};

export const getPayPalStatus = () => {
    return { connected: !!process.env.PAYPAL_CLIENT_ID, mode: process.env.PAYPAL_MODE || 'sandbox' };
};