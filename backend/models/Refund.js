import mongoose from 'mongoose'

// [REAL-DATA-2] заявки на возврат — в Mongo (in-memory запрещён: Render рестартит — данные умирали)
const refundSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '' },
  paymentId: { type: String, default: '' }, // id платежа ЮKassa
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  processedAt: { type: Date, default: null },
  processedBy: { type: String, default: '' },
  yookassaRefundId: { type: String, default: '' },
  lastError: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model('Refund', refundSchema)
