// [HOTFIX-FINAL] Витрина пакетов кредитов (1 кредит = 1 генерация).
// Цены меняет только владелец (PUT /api/credits/packs/:packId) с маржинальным полом (marginService).
import mongoose from 'mongoose'

const creditPackSchema = new mongoose.Schema({
    packId: { type: String, required: true, unique: true }, // pack_100, pack_500, ...
    credits: { type: Number, required: true, min: 1 },
    priceRub: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

const DEFAULT_PACKS = [
    { packId: 'pack_100', credits: 100, priceRub: 99, sortOrder: 1 },
    { packId: 'pack_500', credits: 500, priceRub: 449, sortOrder: 2 },
    { packId: 'pack_1000', credits: 1000, priceRub: 849, sortOrder: 3 },
    { packId: 'pack_5000', credits: 5000, priceRub: 3990, sortOrder: 4 },
]

creditPackSchema.statics.getAll = async function () {
    const existing = await this.find().lean()
    if (!existing.length) {
        await this.insertMany(DEFAULT_PACKS.map(p => ({ ...p })), { ordered: false }).catch(() => {})
        return this.find().sort({ sortOrder: 1 }).lean()
    }
    return this.find().sort({ sortOrder: 1 }).lean()
}

export const CreditPack = mongoose.model('CreditPack', creditPackSchema)
export default CreditPack
