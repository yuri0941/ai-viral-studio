import mongoose from 'mongoose'

const roadmapVoteSchema = new mongoose.Schema({
    featureId: {
        type: String,
        required: true,
    },
    featureTitle: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'testing', 'launched'],
        default: 'planned',
    },
    votes: {
        type: Number,
        default: 0,
    },
    voterIps: [{
        type: String,
        default: [],
    }],
}, { timestamps: true })

roadmapVoteSchema.index({ featureId: 1 }, { unique: true })
roadmapVoteSchema.index({ status: 1, votes: -1 })
roadmapVoteSchema.index({ votes: -1 })

export const RoadmapVote = mongoose.model('RoadmapVote', roadmapVoteSchema)
export default RoadmapVote
