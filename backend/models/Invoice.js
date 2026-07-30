import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, default: 1, min: 0 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, min: 0 },
}, { _id: false });

const requisitesSnapshotSchema = new mongoose.Schema({
  name: { type: String },
  inn: { type: String },
  kpp: { type: String },
  accountNumber: { type: String },
  bank: { type: String },
  bik: { type: String },
  address: { type: String },
  email: { type: String },
  phone: { type: String },
  vatRate: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['RUB', 'USD', 'EUR'],
    default: 'RUB',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'overdue', 'canceled', 'refunded', 'failed'],
    default: 'draft',
    index: true,
  },
  type: {
    type: String,
    enum: ['subscription', 'service', 'advertisement', 'refund', 'manual'],
    default: 'subscription',
  },
  description: {
    type: String,
  },
  items: {
    type: [invoiceItemSchema],
    default: [],
  },
  requisites: {
    type: requisitesSnapshotSchema,
    default: {},
  },
  dueDate: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  provider: {
    type: String,
    enum: ['yookassa', 'stripe', 'cryptomus', 'internal', 'manual', 'none'],
    default: 'none',
  },
  providerPaymentId: {
    type: String,
  },
  paymentUrl: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

invoiceSchema.index({ ownerId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

// Auto-calculate item totals before saving
invoiceSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.total = (item.quantity || 0) * (item.price || 0);
    });
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);
