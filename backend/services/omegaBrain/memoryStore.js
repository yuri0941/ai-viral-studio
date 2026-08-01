import mongoose from 'mongoose'
import { upsertMemory as upsertVector, searchMemory as searchVector } from '../vectorize/vectorizeService.js'

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
    const doc = await OmegaBrainMemory.create({ userId, type: 'fact', content })
    await upsertVector(String(doc._id), content, { userId: String(userId), type: 'fact' }).catch(() => {})
    return doc
}

export async function saveDialog(userId, question, answer, provider) {
    const text = `${question}\n---\n${answer}`
    const doc = await OmegaBrainMemory.create({
        userId,
        type: 'dialog',
        content: text,
        question,
        answer,
        provider,
    })
    await upsertVector(String(doc._id), text, { userId: String(userId), type: 'dialog', provider }).catch(() => {})
    return doc
}

export async function searchVectorMemory(query, limit = 5, userId = null) {
    return searchVector(query, limit, userId)
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

export default { OmegaBrainMemory, saveFact, saveDialog, getMemory, rateMemory, findSimilarDialog, searchVectorMemory }
