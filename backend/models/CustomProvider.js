import mongoose from 'mongoose'

// [KEYS-UNIVERSAL З3] Универсальный слот «Свой провайдер»: владелец подключает любой
// OpenAI-совместимый сервис (Kling, Veo, Kimi, Claude-прокси и т.д.) без деплоя.
// Ключ НЕ светится в ответах API (маскируется на уровне роутов).
const CustomProviderSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 60 },
    baseUrl: { type: String, required: true, maxlength: 300 },
    apiKey: { type: String, required: true },
    model: { type: String, required: true, maxlength: 120 },
    // привязка слота к функциям кабинета (пока: chat — ротация текстовых ответов OMEGA)
    functions: { type: [String], enum: ['chat'], default: ['chat'] },
    isActive: { type: Boolean, default: true },
    isValid: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'invalid'], default: 'active' },
    lastError: { type: String, default: null },
    lastTestedAt: { type: Date, default: null },
}, { timestamps: true })

CustomProviderSchema.index({ ownerId: 1, name: 1 })

export const CustomProvider = mongoose.model('CustomProvider', CustomProviderSchema)
export default CustomProvider
