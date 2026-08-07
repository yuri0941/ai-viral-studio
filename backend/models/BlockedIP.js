import mongoose from 'mongoose'

const blockedIPSchema = new mongoose.Schema({
    ip: { type: String, required: true, index: true },
    reason: { type: String, default: '' },
    bannedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    count: { type: Number, default: 0 },
}, {
    timestamps: true,
})

blockedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const BlockedIP = mongoose.models.BlockedIP || mongoose.model('BlockedIP', blockedIPSchema)
export default BlockedIP
