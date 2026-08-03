import mongoose from 'mongoose'

const apiKeySchema = new mongoose.Schema({
    provider: { type: String, required: true },
    label: { type: String, required: true },
    key: { type: String, required: true },
    keyValue: { type: String, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'invalid', 'missing'], default: 'active' },
    lastRotated: { type: Date, default: Date.now },
}, { timestamps: true })

apiKeySchema.index({ ownerId: 1, provider: 1 }, { unique: true })

export const ApiKey = mongoose.model('ApiKey', apiKeySchema)
export default ApiKey
