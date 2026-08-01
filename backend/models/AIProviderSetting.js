import mongoose from 'mongoose'

const aiProviderSettingSchema = new mongoose.Schema({
    provider: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    lastStatus: { type: String, enum: ['active', 'error', 'missing', 'disabled'], default: 'missing' },
    lastError: { type: String, default: '' },
    lastCheckedAt: { type: Date, default: null },
}, { timestamps: true })

export const AIProviderSetting = mongoose.model('AIProviderSetting', aiProviderSettingSchema)
export default AIProviderSetting
