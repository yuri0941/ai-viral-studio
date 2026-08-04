import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user: { type: String, default: '' },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_progress', 'waiting', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedTo: { type: String, default: '' },
    messages: { type: [String], default: [] },
}, {
    timestamps: true
})

const Ticket = mongoose.model('Ticket', ticketSchema)
export default Ticket
