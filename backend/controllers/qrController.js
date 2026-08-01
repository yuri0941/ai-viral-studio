import qrService from '../services/qrService.js'

export async function listQRs(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await qrService.listQRs(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function generateQR(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { url, type, design, projectId } = req.body
        if (!url) return res.status(400).json({ status: 'error', message: 'url is required' })

        const result = await qrService.generateQR({ url, type, design, userId, projectId })
        res.status(201).json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getAnalytics(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await qrService.getQRAnalytics({ userId, qrId: req.params.id })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function downloadQR(req, res) {
    try {
        const format = req.query.format || 'png'
        const result = await qrService.downloadQR(req.params.id, format)
        if (!result) return res.status(404).json({ status: 'error', message: 'QR not found' })

        res.setHeader('Content-Type', result.contentType)
        res.setHeader('Content-Disposition', `attachment; filename="qr-${req.params.id}.${format}"`)
        res.send(result.buffer)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function deleteQR(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const deleted = await qrService.deleteQR(req.params.id, userId)
        if (!deleted) return res.status(404).json({ status: 'error', message: 'QR not found' })
        res.json({ status: 'success', data: { deleted: true } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function redirectScan(req, res) {
    try {
        const qr = await qrService.getQRByShortCode(req.params.shortCode)
        if (!qr || !qr.isActive) return res.status(404).send('QR code not found')

        await qrService.trackScan({
            shortCode: req.params.shortCode,
            device: req.headers['user-agent'] || '',
            ip: req.ip || req.headers['x-forwarded-for'] || '',
            referrer: req.headers.referer || '',
        })

        res.redirect(qr.url)
    } catch (err) {
        res.status(500).send('Error processing QR')
    }
}

export default { listQRs, generateQR, getAnalytics, downloadQR, deleteQR, redirectScan }
