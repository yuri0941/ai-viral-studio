import mongoose from 'mongoose'

const userAddonSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    addonId: { type: String, required: true, index: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'RUB' },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ['active', 'pending', 'canceled', 'refunded'], default: 'active' },
    paymentProvider: { type: String, enum: ['yookassa', 'stripe', 'paypal', 'manual'], default: 'manual' },
    paymentId: { type: String, default: '' },
    // [ADDONS-MARKETPLACE-RESTORE] снапшот состава на момент покупки:
    // удалённые позиции сохраняются активному подписчику до expiresAt
    includesSnapshot: { type: [String], default: [] },
}, { timestamps: true })

userAddonSchema.index({ userId: 1, addonId: 1 }, { unique: true })

const UserAddon = mongoose.models.UserAddon || mongoose.model('UserAddon', userAddonSchema)
export default UserAddon
