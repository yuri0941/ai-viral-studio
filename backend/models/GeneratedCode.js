import mongoose from 'mongoose';

const generatedCodeSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  spec: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'deployed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const GeneratedCode = mongoose.model('GeneratedCode', generatedCodeSchema);
export default GeneratedCode;
