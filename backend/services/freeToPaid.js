import User from '../models/User.js';

const LIMITS = {
  free: {
    posts: 5,
    generations: 10,
    analytics: 3,
    scheduling: 0,
    watermark: true
  },
  creator: {
    posts: 30,
    generations: 50,
    analytics: 20,
    scheduling: 10,
    watermark: true
  },
  pro: {
    posts: Infinity,
    generations: Infinity,
    analytics: Infinity,
    scheduling: Infinity,
    watermark: false
  }
};

export function checkFreeLimits(user, action) {
  const plan = user.subscription || 'free';
  const limit = LIMITS[plan] || LIMITS.free;
  const used = user.usage || {};

  if (!limit[action] || (used[action] || 0) >= limit[action]) {
    return {
      allowed: false,
      plan,
      action,
      limit: limit[action],
      used: used[action] || 0,
      remaining: Math.max(0, (limit[action] || 0) - (used[action] || 0)),
      upgrade: plan === 'free' ? 'creator' : 'pro'
    };
  }

  return {
    allowed: true,
    plan,
    action,
    limit: limit[action],
    used: used[action] || 0,
    remaining: limit[action] === Infinity ? '∞' : limit[action] - (used[action] || 0),
    upgrade: null
  };
}

export async function incrementUsage(userId, action, count = 1) {
  const user = await User.findById(userId);
  if (!user) return null;
  user.usage = user.usage || {};
  user.usage[action] = (user.usage[action] || 0) + count;
  await user.save();
  return checkFreeLimits(user, action);
}

export async function startGracePeriod(userId) {
  const user = await User.findById(userId);
  if (!user || user.subscription !== 'free') return { skipped: true };

  const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  user.gracePeriod = { active: true, endsAt, messagesSent: 0 };
  await user.save();

  return {
    active: true,
    endsAt,
    message: `⏳ У вас 3 дня grace-периода. Ограничения временно сняты — успейте оценить Pro.` 
  };
}

export async function checkGracePeriod(userId) {
  const user = await User.findById(userId);
  if (!user || !user.gracePeriod?.active) return { active: false };
  if (new Date() > user.gracePeriod.endsAt) {
    user.gracePeriod.active = false;
    await user.save();
    return { active: false, expired: true };
  }
  return { active: true, endsAt: user.gracePeriod.endsAt };
}
