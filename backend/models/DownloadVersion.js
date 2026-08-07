import mongoose from 'mongoose'

const downloadVersionSchema = new mongoose.Schema({
    version: { type: String, required: true, trim: true },
    buildNumber: { type: Number, default: 0 },
    platform: { type: String, enum: ['android', 'windows', 'macos', 'ios', 'linux'], required: true, index: true },
    arch: { type: String, enum: ['all', 'x64', 'arm64', 'universal'], default: 'all' },
    url: { type: String, required: true, trim: true },
    size: { type: Number, default: 0 },
    checksum: { type: String, default: '' },
    signature: { type: String, default: '' },
    changelog: { type: String, default: '' },
    releaseDate: { type: Date, default: Date.now },
    isLatest: { type: Boolean, default: false, index: true },
    isCritical: { type: Boolean, default: false },
    filename: { type: String, default: '' },
}, { timestamps: true })

// Compound index for latest lookup per platform/arch
downloadVersionSchema.index({ platform: 1, arch: 1, isLatest: 1, releaseDate: -1 })

const DownloadVersion = mongoose.models.DownloadVersion || mongoose.model('DownloadVersion', downloadVersionSchema)
export default DownloadVersion
