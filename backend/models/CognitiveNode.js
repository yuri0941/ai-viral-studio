import { Schema, model } from 'mongoose';

const connectionSchema = new Schema({
  to: { type: Schema.Types.ObjectId, ref: 'CognitiveNode' },
  weight: { type: Number, min: 0, max: 1, default: 0.5 },
  relation: { type: String, default: 'related' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const cognitiveNodeSchema = new Schema({
  type: { type: String, enum: ['fact','skill','intent','emotion','decision','prediction','error','trend','project','client','telegram'], required: true },
  content: { type: String, required: true, index: 'text' },
  confidence: { type: Number, min: 0, max: 1, default: 0.8 },
  source: { type: String, default: 'omega' },
  metadata: { type: Schema.Types.Mixed, default: {} },
  connections: [connectionSchema],
  accessCount: { type: Number, default: 0 },
  lastAccessed: { type: Date, default: Date.now },
  archived: { type: Boolean, default: false },
  archiveSummary: String,
  archivedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes for performance
cognitiveNodeSchema.index({ type: 1, confidence: -1 });
cognitiveNodeSchema.index({ lastAccessed: 1, accessCount: -1 });
cognitiveNodeSchema.index({ archived: 1, createdAt: 1 });

export default model('CognitiveNode', cognitiveNodeSchema);
