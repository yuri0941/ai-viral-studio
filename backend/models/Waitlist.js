import mongoose from 'mongoose'

const waitlistSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/,
    },
    niche: {
        type: String,
        enum: ['coffee', 'beauty', 'it', 'auto', 'clothing', 'food', 'other', ''],
        default: '',
    },
    businessSize: {
        type: String,
        enum: ['solo', 'small', 'medium', 'enterprise', ''],
        default: '',
    },
    source: { type: String, default: 'producthunt' },
    referredBy: { type: String, default: '' },
    referralCode: { type: String, default: '' },
    points: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    badge: { type: String, default: '' },
    utm: { type: mongoose.Schema.Types.Mixed, default: {} },
    notified: { type: Boolean, default: false },
    isFoundingMember: { type: Boolean, default: false },
    foundingMemberRank: { type: Number },
    foundingMemberBadge: { type: String, default: '👑 Founder' },
}, { timestamps: true })

waitlistSchema.index({ email: 1 }, { unique: true })
waitlistSchema.index({ points: -1, createdAt: 1 })

waitlistSchema.methods.calculatePosition = async function () {
    const rank = await Waitlist.countDocuments({
        $or: [
            { points: { $gt: this.points } },
            { points: this.points, createdAt: { $lt: this.createdAt } },
        ],
    })
    return rank + 1
}

waitlistSchema.methods.generateReferralCode = function () {
    return 'OMEGA' + this._id.toString().slice(-6).toUpperCase()
}

export const Waitlist = mongoose.model('Waitlist', waitlistSchema)
export default Waitlist
