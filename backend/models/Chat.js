import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
})

const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            default: 'New Chat'
        },
        messages: [messageSchema],
        isPinned: {
            type: Boolean,
            default: false
        },
        tags: [{
            type: String
        }]
    },
    {
        timestamps: true
    }
)

const Chat = mongoose.model('Chat', chatSchema)
export default Chat