import express from 'express'
import DownloadVersion from '../models/DownloadVersion.js'

const router = express.Router()

router.get('/update/:target/:arch/:version', async (req, res) => {
    try {
        const { target, arch, version } = req.params

        const latest = await DownloadVersion.findOne({
            platform: target,
            arch: arch || 'all',
            isLatest: true,
        }).sort({ releaseDate: -1 }).lean()

        if (!latest) {
            return res.status(204).send()
        }

        if (latest.version === version) {
            return res.status(204).send()
        }

        res.json({
            version: latest.version,
            url: latest.url,
            signature: latest.checksum || '',
            notes: latest.changelog || '',
            pub_date: latest.releaseDate?.toISOString() || new Date().toISOString(),
        })
    } catch (err) {
        console.error('[desktopUpdate]', err.message)
        res.status(500).json({ error: err.message })
    }
})

export default router
