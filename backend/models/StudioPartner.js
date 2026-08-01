import mongoose from 'mongoose'

const studioPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['photo_studio', 'coworking', 'street', 'event_space'],
        default: 'photo_studio',
    },
    pricePerHour: {
        type: Number,
        default: 0,
    },
    address: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    photoUrl: {
        type: String,
        default: '',
    },
    amenities: {
        type: [String],
        default: [],
    },
    active: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
})

studioPartnerSchema.index({ city: 1, type: 1, active: 1 })

export const StudioPartner = mongoose.model('StudioPartner', studioPartnerSchema)
export default StudioPartner
