const User = require('../models/User');

function getCurrentHourInfo() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isPeak = hour >= 19 && hour <= 22;
    const weekend = day === 0 || day === 6;
    const midWeek = day >= 1 && day <= 3;
    return { hour, day, isPeak, weekend, midWeek };
}

async function countActiveUsers() {
    try {
        const count = await User.countDocuments({ status: { $ne: 'banned' } });
        return count;
    } catch (e) {
        return 100;
    }
}

async function getAIQueueLoad() {
    // Placeholder: could be replaced with real queue metrics
    return Math.floor(Math.random() * 15);
}

async function calculateDemandMultiplier() {
    const { isPeak, weekend, midWeek } = getCurrentHourInfo();
    const activeUsers = await countActiveUsers();
    const queue = await getAIQueueLoad();

    let multiplier = 1.0;
    if (activeUsers > 500) multiplier += 0.10;
    if (activeUsers > 1000) multiplier += 0.10;
    if (isPeak) multiplier += 0.05;
    if (weekend) multiplier += 0.05;
    if (!midWeek && !weekend) multiplier += 0.05; // Thu/Fri
    if (queue > 10) multiplier += 0.15;

    const badges = [];
    if (isPeak) badges.push('🔥 Пиковое время');
    if (queue > 10) badges.push('⚡ Высокая загрузка AI');
    if (activeUsers > 500) badges.push('📈 Высокий спрос');

    return {
        multiplier: parseFloat(multiplier.toFixed(2)),
        activeUsers,
        queueLoad: queue,
        badges,
        reasons: {
            activeUsers: activeUsers > 500 ? `+${Math.round((activeUsers > 1000 ? 0.2 : 0.1) * 100)}%` : '0%',
            timeOfDay: isPeak ? '+5%' : '0%',
            dayOfWeek: weekend ? '+5%' : (!midWeek ? '+5%' : '0%'),
            aiLoad: queue > 10 ? '+15%' : '0%',
        },
    };
}

async function getPersonalizedPrice(basePrice, userId) {
    const user = await User.findById(userId).lean();
    if (!user) return { finalPrice: basePrice, discounts: [], multiplier: 1.0 };

    const discounts = [];

    const lastLogin = user.lastLoginAt || user.updatedAt || user.createdAt;
    const daysInactive = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
    if (daysInactive >= 7) {
        discounts.push({ type: 'inactivity', reason: 'Возвращайся!', value: 0.10 });
    }

    const subscriptionMonths = user.subscription?.months || 0;
    if (subscriptionMonths >= 3) {
        discounts.push({ type: 'loyalty', reason: 'Лояльность', value: 0.05 });
    }

    const referrals = user.referrals?.count || user.referralCount || 0;
    if (referrals >= 3) {
        discounts.push({ type: 'referral', reason: 'Реферал', value: 0.10 });
    }

    if (user.isFoundingMember) {
        discounts.push({ type: 'foundingMember', reason: 'Founding Member', value: 0.30 });
    }

    const totalDiscount = Math.min(0.5, discounts.reduce((sum, d) => sum + d.value, 0));
    const finalPrice = Math.round(basePrice * (1 - totalDiscount));

    return {
        basePrice,
        finalPrice,
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        discounts,
        userId,
    };
}

async function applyDiscount(user, plan) {
    const demand = await calculateDemandMultiplier();
    const basePrice = plan.basePrice || plan.price || 0;
    const dynamicPrice = Math.round(basePrice * demand.multiplier);
    const personal = await getPersonalizedPrice(dynamicPrice, user._id.toString());

    return {
        planId: plan.id,
        basePrice,
        demandMultiplier: demand.multiplier,
        dynamicPrice,
        ...personal,
        badges: demand.badges,
    };
}

module.exports = {
    calculateDemandMultiplier,
    getPersonalizedPrice,
    applyDiscount,
};
