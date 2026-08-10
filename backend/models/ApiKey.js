import mongoose from 'mongoose'

const ApiKeySchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: {
        type: String,
        required: true,
        enum: ['groq', 'openrouter', 'gemini', 'openai', 'anthropic', 'replicate', 'elevenlabs', 'serpapi', 'youtube', 'cloudflare', 'fireworks', 'mistral', 'cohere', 'deepseek', 'pollinations', 'github', 'huggingface', 'workersai', 'stability', 'azure']
    },
    key: { type: String, required: true },
    // legacy compatibility
    keyValue: { type: String, default: null },
    label: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isValid: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'invalid', 'missing'], default: 'active' },
    lastUsed: Date,
    lastError: String,
    lastRotated: { type: Date, default: Date.now }
}, { timestamps: true })

ApiKeySchema.index({ ownerId: 1, provider: 1 }, { unique: true })

export const ApiKey = mongoose.model('ApiKey', ApiKeySchema)
export default ApiKey
