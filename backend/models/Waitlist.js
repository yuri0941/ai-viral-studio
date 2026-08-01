import mongoose from 'mongoose'

const waitlistSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/,
    },
    source: { type: String, default: 'producthunt' },
    referredBy: { type: String, default: '' },
    utm: { type: mongoose.Schema.Types.Mixed, default: {} },
    notified: { type: Boolean, default: false },
}, { timestamps: true })

waitlistSchema.index({ email: 1 }, { unique: true })

export const Waitlist = mongoose.model('Waitlist', waitlistSchema)
export default Waitlist
