import { ScheduledPost } from '../models/index.js';

export async function runAutoImprovement() {
  try {
    const posts = await ScheduledPost.find({ status: 'published', createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }).lean();
    if (!posts.length) return { improved: 0 };
    const stats = {};
    posts.forEach(p => {
      const tid = p.templateId || 'custom';
      if (!stats[tid]) stats[tid] = { views: 0, clicks: 0, count: 0 };
      stats[tid].views += p.metrics?.views || 0;
      stats[tid].clicks += p.metrics?.clicks || 0;
      stats[tid].count += 1;
    });
    return { improved: Object.keys(stats).length, stats };
  } catch (e) {
    return { error: e.message };
  }
}

export const autoImproveFile = runAutoImprovement;
