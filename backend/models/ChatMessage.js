import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['staff', 'ai', 'client', 'owner'],
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    senderRole: {
        type: String,
        enum: ['owner', 'admin', 'staff', 'client', 'ai'],
    },
    text: {
        type: String,
        required: true,
    },
    attachments: {
        type: [{
            type: { type: String },
            url: String,
            name: String,
            size: Number,
        }],
        default: [],
    },
    reactions: {
        type: Map,
        of: [String],
        default: {},
    },
    pinned: {
        type: Boolean,
        default: false,
    },
    edited: {
        type: Boolean,
        default: false,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

chatMessageSchema.index({ chatId: 1, createdAt: -1 })
chatMessageSchema.index({ senderId: 1, createdAt: -1 })

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
export default ChatMessage
