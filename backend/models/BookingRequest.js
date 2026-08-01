import mongoose from 'mongoose'

const bookingRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectWorkspace',
        default: null,
    },
    type: {
        type: String,
        enum: ['photo_studio', 'coworking', 'street', 'event_space'],
        default: 'photo_studio',
    },
    city: {
        type: String,
        default: '',
    },
    date: {
        type: Date,
        default: null,
    },
    budget: {
        type: Number,
        default: 0,
    },
    notes: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['new', 'pending', 'confirmed', 'cancelled', 'completed'],
        default: 'new',
    },
    matchedStudio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudioPartner',
        default: null,
    },
}, {
    timestamps: true,
})

bookingRequestSchema.index({ userId: 1, createdAt: -1 })
bookingRequestSchema.index({ city: 1, type: 1 })

export const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema)
export default BookingRequest
