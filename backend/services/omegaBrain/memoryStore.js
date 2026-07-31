import mongoose from 'mongoose'

const OmegaMemorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['fact', 'dialog'], required: true, index: true },
    content: { type: String, required: true },
    question: { type: String },
    answer: { type: String },
    provider: { type: String },
    rating: { type: Number, default: 0, min: -1, max: 2 },
    createdAt: { type: Date, default: Date.now },
})

export const OmegaBrainMemory = mongoose.models.OmegaBrainMemory || mongoose.model('OmegaBrainMemory', OmegaMemorySchema, 'omega_memories')

export async function saveFact(userId, content) {
    return OmegaBrainMemory.create({ userId, type: 'fact', content })
}

export async function saveDialog(userId, question, answer, provider) {
    return OmegaBrainMemory.create({
        userId,
        type: 'dialog',
        content: `${question}\n---\n${answer}`,
        question,
        answer,
        provider,
    })
}

export async function getMemory(userId, options = {}) {
    const { limit = 50, type, minRating = -2 } = options
    const query = { userId }
    if (type) query.type = type
    query.rating = { $gte: minRating }
    return OmegaBrainMemory.find(query).sort({ createdAt: -1 }).limit(limit).lean()
}

export async function rateMemory(memoryId, rating) {
    return OmegaBrainMemory.findByIdAndUpdate(memoryId, { $set: { rating } }, { new: true }).lean()
}

export async function findSimilarDialog(userId, question, limit = 5) {
    const words = question.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    const regexes = words.map(w => new RegExp(w, 'i'))
    return OmegaBrainMemory.find({
        userId,
        type: 'dialog',
        rating: { $gte: 2 },
        $or: regexes.map(r => ({ content: { $regex: r } })),
    })
        .sort({ rating: -1, createdAt: -1 })
        .limit(limit)
        .lean()
}

export default { OmegaBrainMemory, saveFact, saveDialog, getMemory, rateMemory, findSimilarDialog }
