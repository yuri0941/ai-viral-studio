import mongoose from 'mongoose';

const ownerRequisitesSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['individual', 'company', 'entrepreneur', 'self_employed'],
    default: 'company',
  },
  name: {
    type: String,
    required: [true, 'Название / ФИО обязательны'],
    trim: true,
  },
  inn: {
    type: String,
    trim: true,
  },
  kpp: {
    type: String,
    trim: true,
  },
  ogrn: {
    type: String,
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  bank: {
    type: String,
    trim: true,
  },
  bik: {
    type: String,
    trim: true,
  },
  corrAccount: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  director: {
    type: String,
    trim: true,
  },
  currency: {
    type: String,
    enum: ['RUB', 'USD', 'EUR'],
    default: 'RUB',
  },
  vatRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  isDefault: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  foreignAccount: {
    companyName: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    swift: { type: String, trim: true, default: '' },
    iban: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    bankAddress: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
}, {
  timestamps: true,
});

// unique: true on ownerId already creates the { ownerId: 1 } index
ownerRequisitesSchema.index({ inn: 1 });

export default mongoose.model('OwnerRequisites', ownerRequisitesSchema);
