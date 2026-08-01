import { User } from '../models/index.js'
import ScheduledPost from '../models/ScheduledPost.js'

function daysSince(date) {
    if (!date) return 999
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function weeksSince(date) {
    return Math.floor(daysSince(date) / 7)
}

export async function predictChurn(userId) {
    const user = await User.findById(userId).lean()
    if (!user) return { status: 'error', message: 'User not found' }

    const lastLogin = user.lastLogin || user.updatedAt || user.createdAt
    const daysInactive = daysSince(lastLogin)

    const postsCount30d = await ScheduledPost.countDocuments({
        userId: user._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })

    const postsCountPrev30d = await ScheduledPost.countDocuments({
        userId: user._id,
        createdAt: {
            $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
    })

    const activityDrop = postsCountPrev30d > 0
        ? Math.max(0, 1 - postsCount30d / postsCountPrev30d)
        : postsCount30d === 0 ? 1 : 0

    const loginScore = Math.min(1, daysInactive / 14)
    const postsScore = activityDrop
    const subscriptionScore = user.subscription === 'free' ? 0.3 : 0
    const ticketsScore = Math.min(1, (user.supportTickets || 0) / 3)

    const score = Math.min(1, Math.round((loginScore * 0.4 + postsScore * 0.35 + subscriptionScore * 0.1 + ticketsScore * 0.15) * 100) / 100)

    let risk = 'low'
    if (score >= 0.7) risk = 'high'
    else if (score >= 0.4) risk = 'medium'

    return {
        status: 'ok',
        userId: user._id,
        score,
        risk,
        factors: {
            daysInactive,
            postsCount30d,
            postsCountPrev30d,
            activityDrop,
            supportTickets: user.supportTickets || 0,
        },
    }
}

export async function getAtRiskUsers(limit = 50) {
    const users = await User.find({ isActive: true }).lean()
    const predictions = []
    for (const user of users) {
        const prediction = await predictChurn(user._id)
        if (prediction.score >= 0.4) {
            predictions.push({
                ...prediction,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                lastLogin: user.lastLogin,
            })
        }
    }
    return predictions.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function generateRetentionOffer(userId, day = 1) {
    const user = await User.findById(userId).lean()
    if (!user) return { status: 'error', message: 'User not found' }

    const offers = {
        1: {
            channel: 'in_app',
            subject: 'Мы заметили, что вы реже заходите',
            body: `Привет, ${user.name}! OMEGA заметила, что вы реже публикуете контент. Вот персональная скидка 20% на тариф Pro — чтобы вы снова набрали обороты.`,
            discount: 20,
        },
        3: {
            channel: 'email',
            subject: 'Кейс клиента вашей ниши',
            body: `${user.name}, посмотрите, как похожий бизнес в нише ${user.niche || 'вашей'} вырос на 300% за месяц с OMEGA.`,
            discount: 0,
        },
        5: {
            channel: 'push',
            subject: '3 идеи постов специально для вас',
            body: `OMEGA подготовила 3 идеи постов под вашу нишу. Откройте приложение, чтобы посмотреть.`,
            discount: 0,
        },
        7: {
            channel: 'email',
            subject: 'Останьтесь — месяц бесплатно',
            body: `${user.name}, мы ценим вас. Останьтесь с нами — получите месяц бесплатно + личную консультацию по стратегии.`,
            discount: 100,
        },
    }

    return { status: 'ok', userId, day, offer: offers[day] || offers[1] }
}

export async function generateExitOffer(userId) {
    const user = await User.findById(userId).lean()
    if (!user) return { status: 'error', message: 'User not found' }

    return {
        status: 'ok',
        userId,
        offer: {
            survey: 'Почему вы решили уйти?',
            options: ['Слишком дорого', 'Не хватает функций', 'Сложно использовать', 'Сменил нишу/бизнес', 'Другое'],
            comeback: 'Возвращайтесь через 3 месяца — скидка 50% навсегда на любой тариф.',
            discount: 50,
        },
    }
}

export async function getChurnStats() {
    const users = await User.find({ isActive: true }).lean()
    let high = 0
    let medium = 0
    let prevented = 0
    let churned = await User.countDocuments({ isActive: false })

    for (const user of users) {
        const pred = await predictChurn(user._id)
        if (pred.risk === 'high') high++
        else if (pred.risk === 'medium') medium++
        else if (pred.score < 0.3 && user.retentionOffersSent > 0) prevented++
    }

    return {
        atRisk: high + medium,
        highRisk: high,
        mediumRisk: medium,
        predicted: high,
        prevented,
        churned,
    }
}

export default { predictChurn, getAtRiskUsers, generateRetentionOffer, generateExitOffer, getChurnStats }
