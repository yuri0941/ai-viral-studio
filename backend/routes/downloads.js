import express from 'express'
import multer from 'multer'
import path from 'path'
import { protect } from '../middleware/auth.js'
import DownloadVersion from '../models/DownloadVersion.js'

const router = express.Router()

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, `${Date.now()}_${file.fieldname}${ext}`)
    },
})
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } })

router.get('/latest', async (req, res) => {
    try {
        const platforms = ['android', 'windows', 'macos']
        const versions = []
        for (const platform of platforms) {
            const v = await DownloadVersion.findOne({ platform, isLatest: true })
                .sort({ releaseDate: -1 })
                .lean()
            if (v) versions.push(v)
        }
        res.json({ success: true, versions })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/history', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)
        const [versions, total] = await Promise.all([
            DownloadVersion.find().sort({ releaseDate: -1 }).skip(skip).limit(Number(limit)).lean(),
            DownloadVersion.countDocuments(),
        ])
        res.json({
            success: true,
            versions,
            total,
            page: Number(page),
            limit: Number(limit),
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/admin/downloads', protect, upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const { version, buildNumber, platform, arch, changelog, isCritical } = req.body
        if (!version || !platform) {
            return res.status(400).json({ error: 'version and platform are required' })
        }

        const url = req.file
            ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            : req.body.url

        if (!url) {
            return res.status(400).json({ error: 'file or url is required' })
        }

        // Unmark previous latest for this platform/arch
        await DownloadVersion.updateMany(
            { platform, arch: arch || 'all' },
            { $set: { isLatest: false } }
        )

        const versionDoc = await DownloadVersion.create({
            version,
            buildNumber: Number(buildNumber) || 0,
            platform,
            arch: arch || 'all',
            url,
            size: req.file?.size || Number(req.body.size) || 0,
            checksum: req.body.checksum || '',
            signature: req.body.signature || '',
            changelog: changelog || '',
            releaseDate: new Date(),
            isLatest: true,
            isCritical: isCritical === 'true' || isCritical === true,
            filename: req.file?.filename || '',
        })

        res.json({ success: true, version: versionDoc })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
