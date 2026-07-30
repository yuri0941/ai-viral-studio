import mongoose from 'mongoose'

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    yearlyDiscount: {
        type: Number,
        default: 0.2,
        min: 0,
        max: 1,
    },
    users: {
        type: Number,
        default: 0,
    },
    color: {
        type: String,
        default: '#6b7280',
    },
    features: {
        type: [String],
        default: [],
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    limits: {
        projects: { type: Number, default: 0 },
        aiRequestsPerDay: { type: Number, default: 0 },
        storageGb: { type: Number, default: 0 },
        apiAccess: { type: Boolean, default: false },
        whiteLabel: { type: Boolean, default: false },
        dedicatedManager: { type: Boolean, default: false },
    },
}, {
    timestamps: true,
})

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
export default SubscriptionPlan
