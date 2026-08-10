import ScheduledPost from '../models/ScheduledPost.js'
import { User } from '../models/index.js'
import { chatWithAI, extractText, generateContent } from './aiService.js'
import { analyzeTemplatePerformance } from './templateEvolution.js'

export async function findEligibleUsers() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const users = await User.find({
        createdAt: { $lte: since },
        subscription: { $in: ['pro', 'agency', 'enterprise', 'business'] },
        isActive: true,
    }).lean()

    const eligible = []
    for (const user of users) {
        const postsCount = await ScheduledPost.countDocuments({ userId: user._id })
        const followers = Number(user.socialAccounts?.instagram?.followers) || Number(user.socialAccounts?.tiktok?.followers) || 1000
        if (postsCount > 5 && followers >= 1000) {
            eligible.push({ user, postsCount, followers })
        }
    }
    return eligible
}

export async function proposeABTest(userId, post) {
    const user = await User.findById(userId).lean()
    if (!user) return { status: 'error', message: 'User not found' }

    const eligible = await findEligibleUsers()
    const isEligible = eligible.some(e => e.user._id.toString() === userId.toString())
    if (!isEligible) {
        return { status: 'not_eligible', message: 'User not eligible for auto A/B learning' }
    }

    const prompt = `Ты — OMEGA. Предложи альтернативный вариант (B) для A/B теста поста. Вариант A:\n"""\n${post.content || post.title}\n"""\n\nСоздай вариант B с другим хуком, но той же темой. Ответь ТОЛЬКО JSON: {variantB: "текст"}.`

    try {
        const res = await chatWithAI(prompt, [], 'ru')
        const text = extractText(res)
        const match = text.match(/\{[\s\S]*\}/)
        const parsed = match ? JSON.parse(match[0]) : {}
        const variantB = parsed.variantB || text
        return {
            status: 'ok',
            postId: post._id,
            variantA: post.content || post.title,
            variantB,
            message: 'OMEGA предлагает A/B тест для вашего следующего поста. Вариант A — ваш, Вариант B — мой. Одобрить?',
        }
    } catch (err) {
        return { status: 'error', message: err.message }
    }
}

export async function approveABTest(userId, postId, choice) {
    const post = await ScheduledPost.findById(postId)
    if (!post) return { status: 'error', message: 'Post not found' }

    const proposal = await proposeABTest(userId, post)
    if (proposal.status !== 'ok') return proposal

    if (choice === 'approve') {
        const variantBPost = await ScheduledPost.create({
            userId,
            title: `${post.title} (B)`,
            content: proposal.variantB,
            platforms: post.platforms || ['instagram'],
            types: post.types || ['post'],
            status: 'scheduled',
            scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
            metadata: { abTest: true, variant: 'B', originalPostId: postId },
        })
        post.metadata = { ...post.metadata, abTest: true, variant: 'A', variantBPostId: variantBPost._id }
        await post.save()
        return { status: 'ok', message: 'A/B тест запущен', variantBPostId: variantBPost._id }
    }

    return { status: 'skipped', message: 'A/B тест отменён клиентом' }
}

export async function resolveABTests() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const tests = await ScheduledPost.find({
        'metadata.abTest': true,
        'metadata.variant': 'A',
        'metadata.variantBPostId': { $exists: true },
        scheduledAt: { $lte: cutoff },
        status: 'published',
    }).lean()

    const results = []
    for (const aPost of tests) {
        const bPost = await ScheduledPost.findById(aPost.metadata.variantBPostId).lean()
        if (!bPost || bPost.status !== 'published') continue

        const aCTR = estimateCTR(aPost)
        const bCTR = estimateCTR(bPost)
        const winner = bCTR > aCTR ? 'B' : 'A'

        if (winner === 'B') {
            await analyzeTemplatePerformance()
        }

        results.push({
            postId: aPost._id,
            variantBPostId: bPost._id,
            aCTR,
            bCTR,
            winner,
            learned: winner === 'B',
        })
    }

    return { resolved: results.length, results }
}

function estimateCTR(post) {
    const views = Number(post.analytics?.views) || Number(post.views) || 1
    const likes = Number(post.analytics?.likes) || Number(post.likes) || 0
    const shares = Number(post.analytics?.shares) || Number(post.shares) || 0
    const comments = Number(post.analytics?.comments) || Number(post.comments) || 0
    const engagement = likes + shares * 2 + comments * 3
    return Math.min(100, (engagement / views) * 100)
}

export default { findEligibleUsers, proposeABTest, approveABTest, resolveABTests }
