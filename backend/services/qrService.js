import crypto from 'crypto'
import QRCode from 'qrcode'
import { QRCode as QRCodeModel } from '../models/index.js'

const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'https://ai-viral-studio.pages.dev'
const QR_BASE_URL = process.env.QR_BASE_URL || `${APP_URL}/qr`

export function generateShortCode() {
    return crypto.randomBytes(5).toString('hex').slice(0, 9)
}

export async function generateQR({ url, type = 'link', design = {}, userId, projectId }) {
    const shortCode = generateShortCode()
    const targetUrl = url.trim()
    const redirectUrl = `${QR_BASE_URL}/${shortCode}`

    const safeUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`

    const qrOptions = {
        color: {
            dark: design.color || '#000000',
            light: design.background || '#ffffff',
        },
        width: 600,
        type: 'png',
        margin: 2,
    }

    const dataUrl = await QRCode.toDataURL(safeUrl, qrOptions)

    const qr = await QRCodeModel.create({
        userId,
        projectId: projectId || null,
        shortCode,
        url: safeUrl,
        type,
        design: {
            color: design.color || '#000000',
            background: design.background || '#ffffff',
            logo: design.logo || '',
            shape: design.shape || 'square',
        },
        scans: [],
        totalScans: 0,
        isActive: true,
    })

    return {
        qr,
        shortCode,
        redirectUrl,
        dataUrl,
    }
}

export async function trackScan({ shortCode, device = '', city = '', country = '', ip = '', referrer = '' }) {
    const qr = await QRCodeModel.findOneAndUpdate(
        { shortCode },
        {
            $push: { scans: { timestamp: new Date(), device, city, country, ip, referrer } },
            $inc: { totalScans: 1 },
        },
        { new: true }
    )
    return qr
}

export async function getQRByShortCode(shortCode) {
    return QRCodeModel.findOne({ shortCode, isActive: true }).lean()
}

export async function listQRs(userId) {
    return QRCodeModel.find({ userId }).sort({ createdAt: -1 }).lean()
}

export async function getQRAnalytics({ userId, qrId }) {
    const filter = { userId }
    if (qrId) filter._id = qrId
    const qrs = await QRCodeModel.find(filter).lean()

    const scans = qrs.flatMap(q => (q.scans || []).map(s => ({ ...s, qrId: q._id, shortCode: q.shortCode })))
    const totalScans = scans.length

    const byDay = {}
    const devices = {}
    const cities = {}

    for (const s of scans) {
        const day = new Date(s.timestamp).toISOString().slice(0, 10)
        byDay[day] = (byDay[day] || 0) + 1
        const d = s.device || 'unknown'
        devices[d] = (devices[d] || 0) + 1
        const c = s.city || 'unknown'
        cities[c] = (cities[c] || 0) + 1
    }

    return {
        totalScans,
        qrCount: qrs.length,
        byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        topDevices: Object.entries(devices).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        topCities: Object.entries(cities).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    }
}

export async function downloadQR(qrId, format = 'png') {
    const qr = await QRCodeModel.findById(qrId).lean()
    if (!qr) return null

    const safeUrl = qr.url.startsWith('http') ? qr.url : `https://${qr.url}`
    const options = {
        color: {
            dark: qr.design?.color || '#000000',
            light: qr.design?.background || '#ffffff',
        },
        width: 1200,
        margin: 2,
    }

    if (format === 'svg') {
        const svg = await QRCode.toString(safeUrl, { ...options, type: 'svg' })
        return { buffer: Buffer.from(svg), contentType: 'image/svg+xml' }
    }

    const buffer = await QRCode.toBuffer(safeUrl, { ...options, type: 'png' })
    return { buffer, contentType: 'image/png' }
}

export async function deleteQR(qrId, userId) {
    return QRCodeModel.findOneAndDelete({ _id: qrId, userId })
}

export default {
    generateQR,
    trackScan,
    getQRByShortCode,
    listQRs,
    getQRAnalytics,
    downloadQR,
    deleteQR,
}
