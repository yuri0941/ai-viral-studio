import mongoose from 'mongoose'

const whiteLabelSchema = new mongoose.Schema({
    agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    brandName: {
        type: String,
        required: true,
        trim: true,
    },
    domain: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true,
    },
    logoUrl: {
        type: String,
        default: '',
    },
    primaryColor: {
        type: String,
        default: '#8b5cf6',
    },
    secondaryColor: {
        type: String,
        default: '#00ff41',
    },
    faviconUrl: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
})

// [P16-FINAL] added: removed duplicate domain index (unique already creates one)

export const WhiteLabel = mongoose.model('WhiteLabel', whiteLabelSchema)
export default WhiteLabel
