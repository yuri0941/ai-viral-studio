import { Referral, User, UsageQuota } from '../models/index.js'
import { topUpGenerations } from './usageQuotaService.js'
import { getOwnerFlags } from '../models/OwnerSettings.js'

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// [REFERRAL-PCT] процент комиссии — из OwnerSettings (кабинет владельца), дефолт 12.
// Применяется к НОВЫМ начислениям; уже начисленное не пересчитывается.
async function getReferralPercent() {
    const flags = await getOwnerFlags()
    return Number.isFinite(flags?.referralPercent) ? flags.referralPercent : 12
}

const referralRewardText = (pct) => `${pct}% комиссии`

const TIER_REWARDS = {
    starter: { label: 'Starter', minReferrals: 0, reward: 'Начните приглашать' },
    friend: { label: 'Друг', minReferrals: 1, reward: '$10 кредитов' },
    popular: { label: 'Популярный', minReferrals: 3, reward: 'Agentic Mode на 1 месяц' },
    vip: { label: 'VIP', minReferrals: 5, reward: 'Скидка 20% навсегда' },
    partner: { label: 'Affiliate Partner', minReferrals: 10, reward: referralRewardText(12) }, // [REFERRAL-PCT] текст динамический — см. getReferralData
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
        ref = await Referral.create({ userId, code, referralCode: code })
    }
    return ref
}

export async function getReferralData(userId) {
    const ref = await getOrCreateReferral(userId)
    const referrals = await Referral.find({ referredBy: userId }).populate('userId', 'name email createdAt').lean()
    const nextTier = Object.values(TIER_REWARDS).find(t => t.minReferrals > ref.referralCount) || TIER_REWARDS.partner
    // [REFERRAL-PCT] текст partner-тира динамический: обещание = механика, всегда из OwnerSettings
    const pct = await getReferralPercent()
    const nextReward = nextTier === TIER_REWARDS.partner ? referralRewardText(pct) : nextTier.reward
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
        referralPercent: pct,
        nextReward,
        referralsToNext: Math.max(0, nextTier.minReferrals - ref.referralCount),
        referredUsers: referrals.map(r => ({
            id: r.userId?._id,
            name: r.userId?.name || '—',
            email: r.userId?.email || '—',
            date: r.createdAt,
            status: r.paidMarked ? 'оплатил' : 'зарегистрировался',
        })),
    }
}

export async function registerReferral(newUserId, referralCode) {
    if (!referralCode) return null
    const referrer = await Referral.findOne({ $or: [{ referralCode: referralCode.toUpperCase() }, { code: referralCode.toUpperCase() }] })
    if (!referrer) return null
    if (String(referrer.userId) === String(newUserId)) return null

    const existing = await Referral.findOne({ userId: newUserId })
    if (existing) {
        if (!existing.referredBy) {
            existing.referredBy = referrer.userId
            await existing.save()
        }
    } else {
        const newCode = generateReferralCode()
        await Referral.create({ userId: newUserId, referredBy: referrer.userId, code: newCode, referralCode: newCode })
    }

    referrer.referralCount += 1
    referrer.tier = calculateTier(referrer.referralCount)
    if (referrer.referralCount === 1) {
        referrer.creditBalance += 10
    }
    await referrer.save()

    // [MONETIZE-2026-08-04] added: both sides get +50 generations
    try {
        await topUpGenerations(referrer.userId, 0.5)
        await topUpGenerations(newUserId, 0.5)
    } catch (err) {
        console.warn('[referralService] top-up generations failed:', err.message)
    }

    return referrer
}

export async function markReferralPaid(userId, amount) {
    const ref = await Referral.findOne({ userId })
    if (!ref || !ref.referredBy) return null

    const referrer = await Referral.findOne({ userId: ref.referredBy })
    if (!referrer) return null

    if (!ref.paidMarked) {
        ref.paidMarked = true
        referrer.paidReferralCount += 1
        // [REF-12PCT→REFERRAL-PCT] N% от суммы платежа в ₽, округление вверх; процент — из OwnerSettings
        // (было фикс $4 — решение владельца 27.08). Применяется к новым начислениям.
        if (Number.isFinite(amount) && amount > 0) {
            const pct = await getReferralPercent()
            referrer.referralEarnings += Math.ceil(amount * pct / 100)
        } else {
            // сумма не передана — не молча: лог + не начисляем
            console.warn(`[referralService] markReferralPaid: amount missing/invalid for userId=${userId} (amount=${amount}) — начисление пропущено`)
        }
        referrer.tier = calculateTier(referrer.referralCount)
        await ref.save()
        await referrer.save()
    }
    return referrer
}

// [REFERRAL-PCT] refund.succeeded → отзыв комиссии (−N% от суммы возврата, округление вверх).
// Вызывается только при реальном переходе платежа в refunded (modifiedCount>0 в контроллере) —
// повторный webhook не списывает дважды. paidMarked не трогаем: повторная оплата того же
// реферала не должна начислить комиссию заново после возврата-переоплаты.
export async function markReferralRefund(userId, amount) {
    const ref = await Referral.findOne({ userId })
    if (!ref || !ref.referredBy || !ref.paidMarked) return null

    const referrer = await Referral.findOne({ userId: ref.referredBy })
    if (!referrer) return null

    if (Number.isFinite(amount) && amount > 0) {
        const pct = await getReferralPercent()
        referrer.referralEarnings = Math.max(0, referrer.referralEarnings - Math.ceil(amount * pct / 100))
        await referrer.save()
    } else {
        console.warn(`[referralService] markReferralRefund: amount missing/invalid for userId=${userId} (amount=${amount}) — отзыв пропущен`)
    }
    return referrer
}

export default {
    getOrCreateReferral,
    getReferralData,
    registerReferral,
    markReferralPaid,
    markReferralRefund,
}
