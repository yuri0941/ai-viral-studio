import mongoose from 'mongoose'

const promoSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    discount: {
        type: Number,
        required: true,
        min: 0,
    },
    type: {
        type: String,
        enum: ['percent', 'fixed'],
        default: 'percent',
    },
    usageLimit: {
        type: Number,
        default: 0,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'disabled'],
        default: 'active',
    },
    expiry: {
        type: Date,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

promoSchema.index({ ownerId: 1, status: 1 })

export const Promo = mongoose.model('Promo', promoSchema)
export default Promo
