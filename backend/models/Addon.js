import mongoose from 'mongoose'

const addonSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'RUB' },
    category: { type: String, enum: ['design', 'video', 'agents', 'analytics', 'integrations', 'white-label', 'other'], default: 'other' },
    icon: { type: String, default: '🎁' },
    isActive: { type: Boolean, default: true },
    requiresPlan: { type: [String], default: [] },
}, { timestamps: true })

const Addon = mongoose.models.Addon || mongoose.model('Addon', addonSchema)
export default Addon
