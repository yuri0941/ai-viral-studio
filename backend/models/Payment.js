import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'refund', 'transfer'],
        required: true,
    },
    source: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    currency: {
        type: String,
        default: 'USD',
    },
    method: {
        type: String,
        enum: ['card', 'crypto', 'paypal', 'bank', 'internal'],
    },
}, {
    timestamps: true,
})

paymentSchema.index({ ownerId: 1, date: -1 })
paymentSchema.index({ type: 1, status: 1 })

export const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
