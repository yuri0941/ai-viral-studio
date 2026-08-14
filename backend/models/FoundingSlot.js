import mongoose from 'mongoose'

// [P1.6-PREP] founding-слот занимается ПЕРВОЙ УСПЕШНОЙ оплатой (webhook), не регистрацией.
// Отдельная коллекция — User-модель не трогаем.
const foundingSlotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    paymentId: { type: String, default: '' }, // yookassaPaymentId первой успешной оплаты
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

const FoundingSlot = mongoose.models.FoundingSlot || mongoose.model('FoundingSlot', foundingSlotSchema)
export default FoundingSlot
