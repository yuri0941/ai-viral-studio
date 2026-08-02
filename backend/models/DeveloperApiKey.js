import mongoose from 'mongoose'
import crypto from 'crypto'

const webhookSchema = new mongoose.Schema({
    url: { type: String, required: true },
    events: { type: [String], default: ['*'] },
    secret: { type: String, default: '' },
    active: { type: Boolean, default: true },
}, { _id: true })

const developerApiKeySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true },
    approved: { type: Boolean, default: false },
    rateLimit: { type: Number, default: 1000 }, // requests per hour
    usage: { type: Number, default: 0 },
    monthlyUsage: { type: Number, default: 0 },
    billingRate: { type: Number, default: 0.01 }, // $ per request
    webhooks: { type: [webhookSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
}, { timestamps: true })

developerApiKeySchema.index({ userId: 1, isActive: 1 })

export function generateApiKey() {
    return 'avs_' + crypto.randomBytes(24).toString('hex')
}

export const DeveloperApiKey = mongoose.model('DeveloperApiKey', developerApiKeySchema)
export default DeveloperApiKey
