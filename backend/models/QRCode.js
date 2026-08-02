import mongoose from 'mongoose'

const scanSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    device: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    ip: { type: String, default: '' },
    referrer: { type: String, default: '' },
}, { _id: false })

const qrCodeSchema = new mongoose.Schema({
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
    shortCode: {
        type: String,
        required: true,
        unique: true,
    },
    url: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['menu', 'vcard', 'promo', 'wifi', 'link'],
        default: 'link',
    },
    design: {
        color: { type: String, default: '#000000' },
        background: { type: String, default: '#ffffff' },
        logo: { type: String, default: '' },
        shape: { type: String, default: 'square' },
    },
    scans: [scanSchema],
    totalScans: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
})

qrCodeSchema.index({ userId: 1, createdAt: -1 })
// [P16-FINAL] added: removed duplicate shortCode index (unique already creates one)

export const QRCode = mongoose.model('QRCode', qrCodeSchema)
export default QRCode
