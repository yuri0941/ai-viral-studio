import mongoose from 'mongoose'

const serverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    region: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'warning', 'maintenance'],
        default: 'online',
    },
    cpu: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    ram: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    disk: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    uptime: {
        type: String,
        default: '99.9%',
    },
    cost: {
        type: Number,
        default: 0,
    },
    lastRestart: {
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

serverSchema.index({ ownerId: 1, status: 1 })

export const Server = mongoose.model('Server', serverSchema)
export default Server
