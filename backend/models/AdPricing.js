import mongoose from 'mongoose'

const adPricingSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    cpm: { type: Number, default: 0, min: 0 },
    cpc: { type: Number, default: 0, min: 0 },
    cpa: { type: Number, default: 0, min: 0 },
    fixedMonth: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['RUB', 'USD', 'EUR'], default: 'RUB' },
}, { timestamps: true })

export const AdPricing = mongoose.models.AdPricing || mongoose.model('AdPricing', adPricingSchema, 'ad_pricing')
export default AdPricing
