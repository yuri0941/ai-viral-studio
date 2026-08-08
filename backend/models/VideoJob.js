import { Schema, model } from 'mongoose';

const videoJobSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['queued','starting','processing','succeeded','failed'], default: 'queued' },
  script: String,
  style: String,
  duration: Number,
  videoUrl: String,
  mock: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default model('VideoJob', videoJobSchema);
