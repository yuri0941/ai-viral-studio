import { Referral, User, generateReferralCode } from '../models/index.js'

const TIER_REWARDS = {
    starter: { label: 'Starter', minReferrals: 0, reward: 'Начните приглашать' },
    friend: { label: 'Друг', minReferrals: 1, reward: '$10 кредитов' },
    popular: { label: 'Популярный', minReferrals: 3, reward: 'Agentic Mode на 1 месяц' },
    vip: { label: 'VIP', minReferrals: 5, reward: 'Скидка 20% навсегда' },
    partner: { label: 'Affiliate Partner', minReferrals: 10, reward: '40% комиссии' },
}

function calculateTier(count) {
    if (count >= 10) return 'partner'
    if (count >= 5) return 'vip'
    if (count >= 3) return 'popular'
    if (count >= 1) return 'friend'
    return 'starter'
}

export async function getOrCreateReferral(userId) {
    let ref = await Referral.findOne({ userId })
    if (!ref) {
        let code = generateReferralCode()
        let attempts = 0
        while (await Referral.exists({ referralCode: code }) && attempts < 5) {
            code = generateReferralCode()
            attempts++
        }
        ref = await Referral.create({ userId, referralCode: code })
    }
    return ref
}

export async function getReferralData(userId) {
    const ref = await getOrCreateReferral(userId)
    const referrals = await Referral.find({ referredBy: userId }).populate('userId', 'name email createdAt').lean()
    const nextTier = Object.values(TIER_REWARDS).find(t => t.minReferrals > ref.referralCount) || TIER_REWARDS.partner
    const baseUrl = process.env.FRONTEND_URL || 'https://aiviral-studio.ru'
    return {
        code: ref.referralCode,
        link: `${baseUrl}/?ref=${ref.referralCode}`,
        count: ref.referralCount,
        paidCount: ref.paidReferralCount,
        earnings: ref.referralEarnings,
        creditBalance: ref.creditBalance,
        tier: ref.tier,
        tierLabel: TIER_REWARDS[ref.tier].label,
        nextReward: nextTier.reward,
        referralsToNext: Math.max(0, nextTier.minReferrals - ref.referralCount),
        referredUsers: referrals.map(r => ({
            id: r.userId?._id,
            name: r.userId?.name || '—',
            email: r.userId?.email || '—',
            date: r.createdAt,
            status: r.paidReferralCount > 0 ? 'оплатил' : 'зарегистрировался',
        })),
    }
}

export async function registerReferral(newUserId, referralCode) {
    if (!referralCode) return null
    const referrer = await Referral.findOne({ referralCode: referralCode.toUpperCase() })
    if (!referrer) return null
    if (String(referrer.userId) === String(newUserId)) return null

    const existing = await Referral.findOne({ userId: newUserId })
    if (existing) {
        if (!existing.referredBy) {
            existing.referredBy = referrer.userId
            await existing.save()
        }
    } else {
        await Referral.create({ userId: newUserId, referredBy: referrer.userId, referralCode: generateReferralCode() })
    }

    referrer.referralCount += 1
    referrer.tier = calculateTier(referrer.referralCount)
    if (referrer.referralCount === 1) {
        referrer.creditBalance += 10
    }
    await referrer.save()
    return referrer
}

export async function markReferralPaid(userId) {
    const ref = await Referral.findOne({ userId })
    if (!ref || !ref.referredBy) return null

    const referrer = await Referral.findOne({ userId: ref.referredBy })
    if (!referrer) return null

    if (!ref.paidMarked) {
        ref.paidMarked = true
        referrer.paidReferralCount += 1
        referrer.referralEarnings += 4
        referrer.tier = calculateTier(referrer.referralCount)
        await ref.save()
        await referrer.save()
    }
    return referrer
}

export default {
    getOrCreateReferral,
    getReferralData,
    registerReferral,
    markReferralPaid,
}
