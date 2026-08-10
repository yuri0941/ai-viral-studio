import { Challenge, User } from '../models/index.js'
import { chatWithAI, extractText } from './aiService.js'
import { generateCaseStudy } from './caseStudyGenerator.js'

export async function getCurrentChallenge() {
    const now = new Date()
    let challenge = await Challenge.findOne({
        startDate: { $lte: now },
        endDate: { $gte: now },
    }).sort({ endDate: -1 }).lean()

    if (!challenge) {
        challenge = await Challenge.findOne().sort({ startDate: -1 }).lean()
    }

    return challenge
}

export async function createMonthlyChallenge(options = {}) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const seedTopics = [
        'Лучший вирусный пост про лето',
        'Короткое видео, которое меняет мышление',
        'История, которую хочется переслать',
        'Мифы в твоей нише, которые все ещё верят',
        'Один хук — миллион просмотров',
    ]
    const seed = options.theme || seedTopics[now.getMonth() % seedTopics.length]

    const aiPrompt = `Придумай тему ежемесячного OMEGA Challenge для креаторов. Вдохновение: "${seed}". 
Верни JSON: {"theme": "короткая цепляющая тема", "description": "1-2 предложения"}. Только JSON, без markdown.`

    let theme = seed
    let description = ''

    try {
        const aiResult = await chatWithAI(aiPrompt, [], 'ru')
        const text = extractText(aiResult)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            theme = parsed.theme || theme
            description = parsed.description || ''
        } else {
            description = text.slice(0, 200)
        }
    } catch (err) {
        console.warn('[challengeService] AI theme generation failed:', err.message)
        description = 'Создай самый вирусный контент на заданную тему и получи призы от OMEGA.'
    }

    const challenge = await Challenge.create({
        theme,
        description,
        startDate: startOfMonth,
        endDate: endOfMonth,
        status: 'active',
        prize: {
            label: options.prizeLabel || '500 кредитов + фичеринг в OMEGA',
            credits: options.credits || 500,
            featureSpot: true,
        },
    })

    return challenge
}

export async function submitToChallenge(userId, payload = {}) {
    const challenge = await getCurrentChallenge()
    if (!challenge) {
        return { success: false, message: 'Нет активного челленджа' }
    }

    const { contentUrl, caption, platform, niche } = payload
    if (!caption && !contentUrl) {
        return { success: false, message: 'Укажите ссылку или описание работы' }
    }

    const exists = challenge.submissions?.some(s => String(s.userId) === String(userId))

    if (exists) {
        await Challenge.updateOne(
            { _id: challenge._id, 'submissions.userId': userId },
            {
                $set: {
                    'submissions.$.contentUrl': contentUrl || '',
                    'submissions.$.caption': caption || '',
                    'submissions.$.platform': platform || 'tiktok',
                    'submissions.$.niche': niche || 'general',
                    'submissions.$.submittedAt': new Date(),
                }
            }
        )
    } else {
        await Challenge.findByIdAndUpdate(challenge._id, {
            $addToSet: { participants: userId },
            $push: {
                submissions: {
                    userId,
                    contentUrl: contentUrl || '',
                    caption: caption || '',
                    platform: platform || 'tiktok',
                    niche: niche || 'general',
                    submittedAt: new Date(),
                }
            }
        })
    }

    return { success: true, message: 'Работа отправлена на оценку OMEGA' }
}

export async function evaluateSubmission(submissionId) {
    const challenge = await Challenge.findOne({ 'submissions._id': submissionId })
    if (!challenge) return { success: false, message: 'Работа не найдена' }

    const submission = challenge.submissions.id(submissionId)
    if (!submission) return { success: false, message: 'Работа не найдена' }

    const prompt = `Оцени вирусный потенциал контента.
Тема челленджа: ${challenge.theme}
Платформа: ${submission.platform}
Описание/хук: ${submission.caption || submission.contentUrl || ''}

Верни JSON: {"viral": 0-100, "creative": 0-100, "engagement": 0-100, "reasoning": "краткое обоснование"}. Только JSON.`

    let evaluation = { viral: 50, creative: 50, engagement: 50, total: 50, reasoning: 'Оценка по умолчанию' }

    try {
        const aiResult = await chatWithAI(prompt, [], 'ru')
        const text = extractText(aiResult)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            evaluation.viral = Math.min(100, Math.max(0, Number(parsed.viral) || 0))
            evaluation.creative = Math.min(100, Math.max(0, Number(parsed.creative) || 0))
            evaluation.engagement = Math.min(100, Math.max(0, Number(parsed.engagement) || 0))
            evaluation.reasoning = parsed.reasoning || ''
            evaluation.total = Math.round((evaluation.viral + evaluation.creative + evaluation.engagement) / 3)
        }
    } catch (err) {
        console.warn('[challengeService] AI evaluation failed:', err.message)
    }

    submission.evaluation = evaluation
    submission.score = evaluation.total
    await challenge.save()

    return { success: true, data: { submission: submission.toObject(), evaluation } }
}

export async function determineWinner(challengeId) {
    const challenge = await Challenge.findById(challengeId)
    if (!challenge) return { success: false, message: 'Челлендж не найден' }

    let best = null
    for (const submission of challenge.submissions || []) {
        if (!submission.evaluation || submission.score === undefined) {
            await evaluateSubmission(submission._id)
        }
        if (!best || submission.score > best.score) {
            best = submission
        }
    }

    if (best) {
        challenge.winnerId = best.userId
        challenge.status = 'finished'
        await challenge.save()
    }

    return { success: true, winner: best || null }
}

export async function autoGenerateCaseStudy(winnerId) {
    const result = await generateCaseStudy(winnerId)
    return result
}

export async function getChallengeResults(challengeId) {
    const challenge = await Challenge.findById(challengeId)
        .populate('winnerId', 'name avatar niche')
        .lean()

    if (!challenge) return { success: false, message: 'Челлендж не найден' }

    const submissions = (challenge.submissions || [])
        .map(s => ({
            ...s,
            userId: s.userId?._id || s.userId,
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))

    return {
        success: true,
        data: {
            challenge,
            winner: challenge.winnerId,
            topSubmissions: submissions.slice(0, 10),
            caseStudy: challenge.caseStudy || '',
        }
    }
}

export async function getArchive(limit = 12) {
    const challenges = await Challenge.find()
        .sort({ startDate: -1 })
        .limit(limit)
        .populate('winnerId', 'name avatar niche')
        .lean()

    return challenges
}

export default {
    getCurrentChallenge,
    createMonthlyChallenge,
    submitToChallenge,
    evaluateSubmission,
    determineWinner,
    autoGenerateCaseStudy,
    getChallengeResults,
    getArchive,
}
