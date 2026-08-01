import { FranchiseKit, Subscription, UsageQuota, ProjectWorkspace } from '../models/index.js'
import { chatWithAI } from './aiService.js'
import { sendEmail } from './emailService.js'

export async function isReady(userId) {
    const missing = []

    const subscription = await Subscription.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }).lean()
    const plan = subscription?.plan?.toLowerCase() || ''
    if (!['agency', 'enterprise'].includes(plan)) {
        missing.push('Agency или Enterprise тариф')
    }

    const workspace = await ProjectWorkspace.findOne({ ownerId: userId }).lean()
    const hasBrandVoice = workspace?.brandVoice && Object.keys(workspace.brandVoice).length > 0
    if (!hasBrandVoice) {
        missing.push('Brand Voice в проекте')
    }

    const quota = await UsageQuota.findOne({ userId }).lean()
    if (!quota || quota.generationsLimit < 50) {
        missing.push('Активный лимит генераций (минимум 50)')
    }

    return { ready: missing.length === 0, missing }
}

export async function generateKit({ userId, projectId, brandName, niche, city, investment, lang = 'ru' }) {
    const { ready, missing } = await isReady(userId)
    if (!ready) {
        return { status: 'requirements_not_met', missing, message: 'Для генерации франшизы нужен Agency тариф, настроенный Brand Voice и активный лимит генераций.' }
    }

    const workspace = await ProjectWorkspace.findOne({ ownerId: userId, _id: projectId || null }).lean()
        || await ProjectWorkspace.findOne({ ownerId: userId }).lean()

    const prompt = `Создай франшизный комплект для бренда "${brandName}" в нише "${niche}" для города ${city || 'Москва'} с инвестициями ${investment || 'до $10k'}.

Верни JSON-объект с полями:
- brandbook: { colors: [...], fonts: [...], logoPrompt: "...", tone: "...", tagline: "..." }
- sop: { scripts: [...], checklists: [...], responseTemplates: [...] }
- training: { videoScripts: [...], onboardingSteps: [...] }
- financialModel: { roi: number, paybackPeriod: number, royalty: number, averageMonthlyRevenue: number, startupCost: number }
- marketingKit: { landingHtml: "...", emailTemplate: "...", socialMediaKit: [...] }

Без лишних пояснений, только JSON.`

    let aiResult
    try {
        aiResult = await chatWithAI(prompt, [], lang, { userId })
    } catch (err) {
        return { status: 'error', message: `AI generation failed: ${err.message}` }
    }

    let data = {}
    try {
        const reply = aiResult?.reply || ''
        const jsonMatch = reply.match(/\{[\s\S]*\}/)
        data = JSON.parse(jsonMatch ? jsonMatch[0] : reply)
    } catch (err) {
        return { status: 'error', message: `Failed to parse AI response: ${err.message}`, raw: aiResult?.reply }
    }

    const kit = await FranchiseKit.create({
        userId,
        projectId: projectId || workspace?._id || null,
        brandName,
        niche: niche || '',
        city: city || '',
        investment: Number(investment) || 0,
        status: 'ready',
        brandbook: data.brandbook || {},
        sop: data.sop || {},
        training: data.training || {},
        financialModel: data.financialModel || {},
        marketingKit: data.marketingKit || {},
        files: {
            brandbook: JSON.stringify(data.brandbook || {}),
            sop: JSON.stringify(data.sop || {}),
            training: JSON.stringify(data.training || {}),
            financialModel: JSON.stringify(data.financialModel || {}),
            landing: data.marketingKit?.landingHtml || '',
        },
    })

    return {
        status: 'ready',
        kitId: kit._id,
        brandName,
        downloadUrl: `/api/franchise/${kit._id}/download`,
        data: {
            brandbook: kit.brandbook,
            sop: kit.sop,
            training: kit.training,
            financialModel: kit.financialModel,
            marketingKit: kit.marketingKit,
        },
    }
}

export async function listKits(userId) {
    return FranchiseKit.find({ userId }).sort({ createdAt: -1 }).lean()
}

export async function getKitById(id, userId) {
    return FranchiseKit.findOne({ _id: id, userId }).lean()
}

export async function buildZipArchive(kit) {
    const brandbook = JSON.stringify(kit.brandbook, null, 2)
    const sop = JSON.stringify(kit.sop, null, 2)
    const training = JSON.stringify(kit.training, null, 2)
    const financial = JSON.stringify(kit.financialModel, null, 2)
    const landing = kit.marketingKit?.landingHtml || ''

    const archive = {
        'brandbook.json': brandbook,
        'sop.json': sop,
        'training.json': training,
        'financial_model.json': financial,
        'landing.html': landing,
        'email_template.txt': kit.marketingKit?.emailTemplate || '',
        'social_kit.txt': (kit.marketingKit?.socialMediaKit || []).join('\n---\n'),
    }

    return archive
}

export async function sendToCandidates({ kitId, userId, recipients = [] }) {
    const kit = await getKitById(kitId, userId)
    if (!kit) return { status: 'error', message: 'Kit not found' }

    const validRecipients = recipients.filter(r => r.includes('@'))
    if (!validRecipients.length) {
        return { status: 'error', message: 'No valid email recipients' }
    }

    for (const to of validRecipients) {
        await sendEmail({
            to,
            subject: `Франшиза ${kit.brandName} — информационный пакет`,
            text: `Здравствуйте! Во вложении франшизный пакет бренда ${kit.brandName}.\n\nНиша: ${kit.niche}\nГород: ${kit.city}\nИнвестиции: ${kit.investment}\n\nПодробнее: ${process.env.FRONTEND_URL || 'https://ai-viral-studio.pages.dev'}/franchise`,
            html: `<p>Здравствуйте!</p><p>Во вложении франшизный пакет бренда <strong>${kit.brandName}</strong>.</p><p>Ниша: ${kit.niche}<br>Город: ${kit.city}<br>Инвестиции: ${kit.investment}</p>`,
        })
    }

    await FranchiseKit.findByIdAndUpdate(kitId, { $set: { recipients: validRecipients, status: 'sent' } })

    return { status: 'sent', recipients: validRecipients.length }
}

export default {
    isReady,
    generateKit,
    listKits,
    getKitById,
    buildZipArchive,
    sendToCandidates,
}
