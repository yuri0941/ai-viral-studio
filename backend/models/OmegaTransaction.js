import mongoose from 'mongoose'

const omegaTransactionSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'allocation', 'investment', 'crypto_trade'],
        required: true,
    },
    category: {
        type: String,
        enum: ['ads', 'infrastructure', 'api_ai', 'freelance', 'emergency', 'salary', 'reserve', 'growth'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending',
    },
    source: {
        type: String,
        enum: ['mrr', 'manual', 'omega_auto', 'crypto', 'external'],
        default: 'manual',
    },
    approvedBy: {
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

omegaTransactionSchema.index({ ownerId: 1, type: 1, createdAt: -1 })
omegaTransactionSchema.index({ ownerId: 1, status: 1 })

export const OmegaTransaction = mongoose.model('OmegaTransaction', omegaTransactionSchema)
export default OmegaTransaction
