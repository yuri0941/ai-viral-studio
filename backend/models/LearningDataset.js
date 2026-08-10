import mongoose from 'mongoose'

const learningDatasetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, enum: ['user', 'omega'], required: true },
    message: { type: String, required: true },
    intent: { type: String, default: '' },
    sentiment: { type: Number, min: -1, max: 1, default: 0 },
    engagementScore: { type: Number, min: 0, max: 100, default: 0 },
    source: { type: String, enum: ['local_brain', 'groq', 'openrouter', 'pattern', 'openai', 'gemini', 'github', 'huggingface', 'cloudflare', 'workersai', 'mistral', 'cohere', 'deepseek', 'together', 'fireworks', 'cerebras', 'pollinations', 'web_chat', 'telegram', 'api', 'system'], default: 'pattern' },
    templateUsed: { type: String, default: '' },
    wasHelpful: { type: Boolean, default: false },
    vector: { type: [Number], default: [] },
}, {
    timestamps: true,
})

learningDatasetSchema.index({ intent: 1 })

export const LearningDataset = mongoose.model('LearningDataset', learningDatasetSchema)
export default LearningDataset
