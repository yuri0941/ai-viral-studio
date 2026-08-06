import mongoose from 'mongoose'

const dialogueProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    tone: { type: String, enum: ['formal', 'casual', 'ironic', 'technical', 'neutral'], default: 'neutral' },
    emotionalHistory: {
        type: [{
            emotion: { type: String, required: true },
            intensity: { type: Number, min: 0, max: 1, default: 0.5 },
            date: { type: Date, default: Date.now },
        }],
        default: [],
    },
    vocabulary: { type: [String], default: [] },
    preferredResponseLength: { type: String, enum: ['short', 'medium', 'detailed'], default: 'medium' },
    lastAdaptedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
})

export const DialogueProfile = mongoose.model('DialogueProfile', dialogueProfileSchema)
export default DialogueProfile
