import DiscountPost from '../models/DiscountPost.js';
import { publishToChannel } from './channelPublisher.js';

export async function generateDiscountPost(planId = 'pro', forcedPercent = null) {
  const plans = { pro: { name: 'Pro', price: 990 }, agency: { name: 'Agency', price: 4990 } };
  const plan = plans[planId] || plans.pro;
  const percent = forcedPercent || [20, 30, 50][Math.floor(Math.random() * 3)];
  const newPrice = Math.round(plan.price * (1 - percent / 100));
  const code = `OMEGA${percent}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
  return await DiscountPost.create({
    title: `🔥 Скидка ${percent}% на ${plan.name}`,
    description: `Лучший тариф для бизнеса. Действует 48 часов.`,
    discountPercent: percent,
    oldPrice: plan.price,
    newPrice,
    planId,
    promoCode: code,
    validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000)
  });
}

export async function publishDiscountToChannel(discountId, configId) {
  const discount = await DiscountPost.findById(discountId);
  if (!discount || !discount.isActive) return { error: 'Discount not found' };
  const caption = `🔥 <b>${discount.title}</b>\n━━━━━━━━━━━━━━\n${discount.description}\n\n💰 <s>${discount.oldPrice}₽</s> → <b>${discount.newPrice}₽</b> (-${discount.discountPercent}%)\n\n🎁 Промокод: <code>${discount.promoCode}</code>\n⏳ Действует до: ${discount.validUntil.toLocaleDateString('ru-RU')}\n\n👇 Получить скидку:\nhttps://aiviral-studio.ru/signup?plan=${discount.planId}&code=${discount.promoCode}\n\n<i>AI Viral Studio | OMEGA 🤖</i>`;
  return await publishToChannel(configId, 'promotional', caption);
}
