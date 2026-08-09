import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: String,
  role: String,
  message: String,
  response: String,
  rating: { type: String, enum: ['👍', '👎'], default: null },
  context: String, // 'telegram' | 'web'
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export async function saveFeedback({ userId, role, message, response, context }) {
  return await Feedback.create({ userId, role, message, response, context });
}

export async function rateFeedback(feedbackId, rating) {
  return await Feedback.findByIdAndUpdate(feedbackId, { rating }, { new: true });
}

export async function getFeedbackStats(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const all = await Feedback.find({ createdAt: { $gte: since } }).lean();
  const thumbsUp = all.filter(f => f.rating === '👍').length;
  const thumbsDown = all.filter(f => f.rating === '👎').length;
  return { total: all.length, thumbsUp, thumbsDown, satisfaction: all.length ? Math.round(thumbsUp / all.length * 100) : 0 };
}
