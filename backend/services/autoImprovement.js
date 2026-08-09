import { ScheduledPost } from '../models/index.js';

export async function runAutoImprovement() {
  try {
    const posts = await ScheduledPost.find({ status: 'published', createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }).lean();
    if (!posts.length) return { improved: 0, message: 'Нет данных за 7 дней' };
    const stats = {};
    posts.forEach(p => {
      const tid = p.templateId || 'custom';
      if (!stats[tid]) stats[tid] = { views: 0, clicks: 0, count: 0, ctr: 0 };
      stats[tid].views += p.metrics?.views || 0;
      stats[tid].clicks += p.metrics?.clicks || 0;
      stats[tid].count += 1;
    });
    Object.keys(stats).forEach(tid => {
      stats[tid].ctr = stats[tid].views > 0 ? (stats[tid].clicks / stats[tid].views * 100).toFixed(2) : 0;
    });
    let archived = 0;
    try {
      const { Template } = await import('../models/index.js');
      if (Template) {
        for (const [tid, s] of Object.entries(stats)) {
          if (s.count >= 5 && s.ctr < 2) {
            await Template.findOneAndUpdate(
              { _id: tid },
              { status: 'archived', archiveReason: `CTR ${s.ctr}% < 2%` }
            );
            archived++;
          }
        }
      }
    } catch (e) {
      console.log('[Auto-Improve] Template model not available, skipping archive');
    }
    return { improved: Object.keys(stats).length, archived, stats };
  } catch (e) {
    return { error: e.message };
  }
}

export const autoImproveFile = runAutoImprovement;
