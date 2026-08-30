import mongoose from 'mongoose'

const addonSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'RUB' },
    category: { type: String, enum: ['design', 'video', 'agents', 'analytics', 'integrations', 'white-label', 'other'], default: 'other' },
    icon: { type: String, default: '🎁' },
    isActive: { type: Boolean, default: true },
    // [ADDONS-MARKETPLACE-RESTORE] состав аддона («что входит») — редактируется owner из кабинета
    includes: { type: [String], default: [] },
    // [ADDONS-COMPOSITION-LINK] привязка к реальным функциям: ключи из config/addonEntitlements.js
    features: { type: [String], default: [] },
    requiresPlan: { type: [String], default: [] },
    currencies: {
        RUB: { type: Number },
        USD: { type: Number },
        EUR: { type: Number },
        UAH: { type: Number },
        KZT: { type: Number },
    },
    paymentMethods: [{ type: String, enum: ['yookassa', 'stripe', 'paypal', 'crypto'] }],
    ownerPriceConfig: {
        customPrice: { type: Number },
        customCurrency: { type: String, default: 'RUB' },
        discountPercent: { type: Number, default: 0 },
        aiRecommendedPrice: { type: Number },
        aiRecommendationReason: { type: String },
        lastAnalyzed: { type: Date },
    },
    isEditableByOwner: { type: Boolean, default: true },
}, { timestamps: true })

const Addon = mongoose.models.Addon || mongoose.model('Addon', addonSchema)
export default Addon
