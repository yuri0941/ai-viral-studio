import mongoose from 'mongoose'
import crypto from 'crypto'

const referralSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    referralCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    paidReferralCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    referralEarnings: {
        type: Number,
        default: 0,
        min: 0,
    },
    tier: {
        type: String,
        enum: ['starter', 'friend', 'popular', 'vip', 'partner'],
        default: 'starter',
    },
    creditBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    paidMarked: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

referralSchema.index({ referredBy: 1 })

export const Referral = mongoose.model('Referral', referralSchema)

export function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase()
}

export default Referral
