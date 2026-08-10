import { chatWithAI } from './aiService.js';
import Booking from '../models/Booking.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const INTENTS = {
  booking: /(забронируй|бронь|встреча|консультация|студия|запиши|записаться)/i,
  order: /(закажи|заказ|оформи|купи|приобрести)/i,
  purchase: /(оплатить|платеж|тариф|подписка|pro|business|agency)/i,
  info: /(информация|расскажи|сколько стоит|как работает)/i
};

function detectIntent(request) {
  const text = request.toLowerCase();
  for (const [intent, pattern] of Object.entries(INTENTS)) {
    if (pattern.test(text)) return intent;
  }
  return 'info';
}

export async function handleConciergeRequest(userId, request) {
  const user = await User.findById(userId);
  const intent = detectIntent(request);

  switch (intent) {
    case 'booking':
      return handleBooking(userId, request, user);
    case 'order':
      return handleOrder(userId, request, user);
    case 'purchase':
      return handlePurchase(userId, request, user);
    default:
      return handleInfo(userId, request, user);
  }
}

export async function handleBooking(userId, request, user) {
  const typeMatch = request.match(/(студия|консультация|встреча|zoom|звонок)/i);
  const dateMatch = request.match(/(\d{1,2}[.\/\-]\d{1,2}[.\/\-]?\d{0,4})/);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'consultation';
  const date = dateMatch ? dateMatch[1] : null;

  const booking = await Booking.create({
    userId,
    type,
    date,
    details: request,
    status: 'pending'
  });

  return {
    intent: 'booking',
    message: `✅ Бронирование получено. Тип: ${type}. Дата: ${date || 'уточним'}. Ожидайте подтверждения.`,
    bookingId: booking._id
  };
}

export async function handleOrder(userId, request, user) {
  const order = await Order.create({
    userId,
    service: 'concierge-order',
    details: request,
    price: null,
    status: 'pending'
  });

  return {
    intent: 'order',
    message: `✅ Заказ принят. Мы оценим стоимость и свяжемся с вами.`,
    orderId: order._id
  };
}

export async function handlePurchase(userId, request, user) {
  const planMatch = request.match(/(pro|business|agency|enterprise)/i);
  const plan = planMatch ? planMatch[1].toLowerCase() : 'pro';

  return {
    intent: 'purchase',
    message: `💳 Перехожу к оплате тарифа ${plan}...`,
    plan,
    redirectUrl: `/subscriptions?plan=${plan}`
  };
}

export async function handleInfo(userId, request, user) {
  const answer = await chatWithAI(`Пользователь спрашивает: ${request}\nОтветь кратко, по делу, как консьерж AI Viral Studio. Если нужно — предложи связаться с оператором.`, [], user?.preferences?.language || 'ru', { role: 'business' });
  return { intent: 'info', message: answer };
}
