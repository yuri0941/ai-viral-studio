import mongoose from 'mongoose';

// [v9.9.19.14-MEMORY-GRAPH-PAYMENT-FIX] 12 слоёв памяти OMEGA — реальная персистентность в MongoDB.
// 8 существующих (short_term..emotional) + 4 новых (prospective, metacognitive, social, instrumental).
const OmegaMemoryLayerSchema = new mongoose.Schema({
  layer: {
    type: String,
    required: true,
    unique: true,
    index: true,
    enum: ['short_term', 'working', 'long_term', 'semantic', 'procedural', 'episodic', 'owner_profile', 'emotional',
      'prospective', 'metacognitive', 'social', 'instrumental'],
  },
  entries: [{
    id: String,
    type: String,           // fact | skill | event | command | profile | pattern | ...
    content: mongoose.Schema.Types.Mixed,
    tags: [String],
    createdAt: Date,
    updatedAt: Date,
    accessCount: { type: Number, default: 0 },
  }],
  lastUpdated: Date,
  backupChecksum: String,
  version: { type: Number, default: 0 },
}, { timestamps: true });

OmegaMemoryLayerSchema.index({ 'entries.tags': 1 });
OmegaMemoryLayerSchema.index({ 'entries.createdAt': -1 });

export default mongoose.model('OmegaMemoryLayer', OmegaMemoryLayerSchema);
