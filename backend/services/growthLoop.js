import crypto from 'crypto';
import { chatWithAI } from './aiService.js';
import Referral from '../models/Referral.js';
import User from '../models/User.js';

export async function generateReferralLink(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  let ref = await Referral.findOne({ userId });
  if (!ref) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    ref = await Referral.create({ userId, code, clicks: 0, signups: 0, revenue: 0 });
  }
  const baseUrl = process.env.FRONTEND_URL || 'https://aiviral.onrender.com';
  return { code: ref.code, link: `${baseUrl}/?ref=${ref.code}` };
}

export async function recordReferralClick(code) {
  const ref = await Referral.findOneAndUpdate({ code }, { $inc: { clicks: 1 } }, { new: true });
  return ref;
}

export async function recordReferralSignup(code, newUserId) {
  const ref = await Referral.findOneAndUpdate(
    { code },
    { $inc: { signups: 1 }, $push: { referrals: { userId: newUserId, createdAt: new Date() } } },
    { new: true }
  );
  return ref;
}

export function shouldAddWatermark(user) {
  if (!user) return true;
  const exempt = ['agency', 'enterprise', 'owner'];
  if (exempt.includes(user.role)) return false;
  if (['agency', 'enterprise'].includes(user.subscription)) return false;
  return true;
}

export async function addWatermark(content, user) {
  if (!shouldAddWatermark(user)) return content;
  const watermark = '✨ Сделано в AI Viral Studio';
  if (typeof content === 'string') return `${content}\n\n${watermark}`;
  return { ...content, text: `${content.text || ''}\n\n${watermark}` };
}

export async function getLeaderboard(period = 'month') {
  const since = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const date = new Date(Date.now() - since * 24 * 60 * 60 * 1000);
  const top = await Referral.find({ updatedAt: { $gte: date } })
    .sort({ signups: -1, revenue: -1 })
    .limit(100)
    .populate('userId', 'name avatar')
    .lean();

  return top.map((r, i) => ({
    rank: i + 1,
    name: r.userId?.name || 'Anon',
    avatar: r.userId?.avatar || '',
    signups: r.signups,
    revenue: r.revenue,
    viralScore: r.signups * 100 + Math.round(r.revenue / 10)
  }));
}

export async function startChallenge(theme = 'viral-august') {
  const prompt = `Придумай ежемесячный челлендж для креаторов в AI Viral Studio. Тема: ${theme}. Цель, правила, приз, критерии победы. Кратко, вдохновляюще.`;
  const description = await chatWithAI(prompt, [], 'ru', { role: 'business' });
  return {
    theme,
    title: `Челлендж: ${theme}`,
    description,
    prize: '1 месяц Pro подписки',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
}
