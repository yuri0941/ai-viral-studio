import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: String,
    amount: Number,
    currency: { type: String, default: 'RUB' },
    status: { type: String, enum: ['pending', 'succeeded', 'canceled'], default: 'pending' },
    yookassaPaymentId: String,
    paidAt: Date,
    createdAt: { type: Date, default: Date.now }
})

paymentSchema.index({ userId: 1, status: 1 })
paymentSchema.index({ createdAt: -1 })

export const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
