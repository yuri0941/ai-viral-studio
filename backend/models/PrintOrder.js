import mongoose from 'mongoose'

const printItemSchema = new mongoose.Schema({
    variantId: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    fileUrl: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: false })

const shippingSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
}, { _id: false })

const printOrderSchema = new mongoose.Schema({
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
    qrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QRCode',
        default: null,
    },
    provider: {
        type: String,
        enum: ['printful', 'manual', 'local'],
        default: 'manual',
    },
    items: [printItemSchema],
    shippingAddress: shippingSchema,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    externalOrderId: {
        type: String,
        default: '',
    },
    trackingUrl: {
        type: String,
        default: '',
    },
    totalCost: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
})

printOrderSchema.index({ userId: 1, createdAt: -1 })
printOrderSchema.index({ externalOrderId: 1 })

export const PrintOrder = mongoose.model('PrintOrder', printOrderSchema)
export default PrintOrder
