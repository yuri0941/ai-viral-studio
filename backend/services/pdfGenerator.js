import PDFDocument from 'pdfkit'
import { getAllChannelAnalytics } from './channelAnalytics.js'
import { getAllAudienceInsights } from './audienceService.js'
import { chatWithAI } from './aiService.js'

export async function generateReport({ userId, type = 'weekly', channels = ['instagram', 'tiktok'], format = 'pdf' }) {
    const analytics = await getAllChannelAnalytics(userId)
    const audience = await getAllAudienceInsights(userId)
    const connectedAnalytics = analytics.filter(a => a.status === 'connected')
    const connectedAudience = audience.filter(a => a.status === 'success')

    if (connectedAnalytics.length === 0 && connectedAudience.length === 0) {
        return {
            status: 'no_data',
            message: 'Нет данных для отчёта. Подключите соцсети в Интеграциях.',
        }
    }

    const summary = connectedAnalytics.map(a => (
        `${a.platform}: подписчики ${a.data?.followers || a.data?.subscribers || 0}, просмотры ${a.data?.views || 0}`
    )).join('; ')

    const aiPrompt = `Проанализируй метрики и напиши краткие выводы + 3 рекомендации для владельца. Метрики: ${summary}. Тип отчёта: ${type}. Язык: русский.`
    let aiInsights = ''
    try {
        const aiResult = await chatWithAI(aiPrompt, [], 'ru')
        aiInsights = aiResult.reply || aiResult.content || aiResult.text || ''
    } catch (err) {
        aiInsights = 'AI-выводы временно недоступны.'
    }

    if (format === 'excel') {
        return {
            status: 'success',
            format: 'excel',
            message: 'Excel отчёт требует ручного формирования на фронтенде (xlsx библиотека уже установлена).',
            data: { analytics: connectedAnalytics, audience: connectedAudience, aiInsights },
        }
    }

    const doc = new PDFDocument({ margin: 50 })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks)
            resolve({
                status: 'success',
                format: 'pdf',
                buffer: pdfBuffer,
                base64: pdfBuffer.toString('base64'),
            })
        })

        doc.fontSize(24).text('AI Viral Studio — Отчёт', { align: 'center' })
        doc.moveDown()
        doc.fontSize(14).text(`${type === 'weekly' ? 'Еженедельный' : 'Ежемесячный'} отчёт`, { align: 'center' })
        doc.fontSize(10).text(new Date().toLocaleString('ru-RU'), { align: 'center' })
        doc.moveDown(2)

        doc.fontSize(18).text('Каналы', { underline: true })
        doc.moveDown()
        connectedAnalytics.forEach(a => {
            doc.fontSize(12).text(`${a.platform}: ${a.status}`)
            doc.fontSize(10).text(`Подписчики: ${a.data?.followers || a.data?.subscribers || 0}`)
            doc.fontSize(10).text(`Просмотры: ${a.data?.views || 0}`)
            doc.moveDown()
        })

        if (connectedAudience.length > 0) {
            doc.addPage()
            doc.fontSize(18).text('Аудитория', { underline: true })
            doc.moveDown()
            connectedAudience.forEach(a => {
                doc.fontSize(12).text(`${a.platform}`)
                doc.fontSize(10).text(`Возрастные группы: ${JSON.stringify(a.data?.ageGroups || [])}`)
                doc.moveDown()
            })
        }

        doc.addPage()
        doc.fontSize(18).text('AI-выводы и рекомендации', { underline: true })
        doc.moveDown()
        doc.fontSize(11).text(aiInsights, { align: 'left', lineGap: 4 })

        doc.end()
    })
}

export default { generateReport }
