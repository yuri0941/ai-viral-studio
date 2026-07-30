import mongoose from 'mongoose'

const apiKeySchema = new mongoose.Schema({
    provider: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    key: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'invalid', 'missing'], default: 'active' },
    lastRotated: { type: Date, default: Date.now },
}, { timestamps: true })

export const ApiKey = mongoose.model('ApiKey', apiKeySchema)
export default ApiKey
