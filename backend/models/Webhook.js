import mongoose from 'mongoose'
import crypto from 'crypto'

const webhookSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    events: { type: [String], default: ['*'] },
    secret: { type: String, default: () => crypto.randomBytes(16).toString('hex') },
    isActive: { type: Boolean, default: true },
    lastStatus: { type: Number, default: null },
    lastCalledAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
}, { timestamps: true })

webhookSchema.index({ userId: 1, isActive: 1 })

export const Webhook = mongoose.model('Webhook', webhookSchema)
export default Webhook
