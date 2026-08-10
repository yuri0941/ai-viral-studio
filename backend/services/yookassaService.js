import { getProviderKey } from './aiService.js'

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

// [v9.9.19-MASTER-AUDIT] hot-reload: ключи через getProviderKey (env → cache → MongoDB)
async function getAuthHeaders() {
  const shopId = await getProviderKey('yookassa_shop_id');
  const secretKey = await getProviderKey('yookassa_secret');
  if (!shopId || !secretKey) {
    throw new Error('Ключи ЮKassa не настроены. Добавьте их в Кабинет владельца → API Ключи (yookassa_shop_id, yookassa_secret)');
  }
  const token = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    'Idempotence-Key': `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
  };
}

export async function createPayment({ amount, currency = 'RUB', description, returnUrl, metadata = {} }) {
  const rubAmount = Number(amount).toFixed(2);

  const body = {
    amount: {
      value: rubAmount,
      currency: currency.toUpperCase(),
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl || process.env.YOOKASSA_RETURN_URL || 'http://localhost:3000/dashboard/finance',
    },
    description: description || 'Подписка AI Viral Studio',
    metadata: {
      ...metadata,
      source: 'ai_viral_studio',
      env: process.env.NODE_ENV || 'development',
    },
    test: process.env.NODE_ENV !== 'production', // Включаем тестовый режим вне продакшена
  };

  try {
    const response = await fetch(YOOKASSA_API_URL, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[yookassaService:createPayment] Error:', data);
      throw new Error(data?.description || `YooKassa HTTP ${response.status}`);
    }

    return {
      success: true,
      paymentId: data.id,
      status: data.status,
      confirmationUrl: data.confirmation?.confirmation_url,
      amount: data.amount,
      description: data.description,
      test: data.test,
      raw: data,
    };
  } catch (err) {
    console.error('[yookassaService:createPayment]', err.message);
    throw err;
  }
}

export async function checkPayment(paymentId) {
  if (!paymentId) throw new Error('paymentId обязателен');

  try {
    const response = await fetch(`${YOOKASSA_API_URL}/${paymentId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[yookassaService:checkPayment] Error:', data);
      throw new Error(data?.description || `YooKassa HTTP ${response.status}`);
    }

    return {
      success: true,
      paymentId: data.id,
      status: data.status,
      paid: data.paid,
      amount: data.amount,
      metadata: data.metadata,
      createdAt: data.created_at,
      raw: data,
    };
  } catch (err) {
    console.error('[yookassaService:checkPayment]', err.message);
    throw err;
  }
}

export function handleWebhook(body) {
  if (!body || !body.event || !body.object) {
    return { success: false, message: 'Invalid webhook payload' };
  }

  const event = body.event;
  const payment = body.object;

  const result = {
    success: true,
    event,
    paymentId: payment.id,
    status: payment.status,
    paid: payment.paid,
    amount: payment.amount,
    metadata: payment.metadata || {},
    description: payment.description,
    processedAt: new Date().toISOString(),
  };

  switch (event) {
    case 'payment.succeeded':
      result.action = 'mark_paid';
      break;
    case 'payment.canceled':
      result.action = 'mark_canceled';
      break;
    case 'payment.waiting_for_capture':
      result.action = 'capture_required';
      break;
    case 'refund.succeeded':
      result.action = 'mark_refunded';
      break;
    default:
      result.action = 'ignore';
  }

  return result;
}

export async function createInvoicePayment({ invoiceId, amount, description, returnUrl, metadata = {} }) {
  return createPayment({
    amount,
    currency: 'RUB',
    description: description || `Счёт №${invoiceId}`,
    returnUrl,
    metadata: { ...metadata, invoiceId },
  });
}

// [PAYMENT-v5.2] added: aliases used by unified checkout
export const createYooKassaPayment = createPayment
export const checkYooKassaPayment = checkPayment
