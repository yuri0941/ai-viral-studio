import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import ClientDialogue from '../models/ClientDialogue.js';

const router = Router();

router.get('/', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const total = await ClientDialogue.countDocuments();
    const converted = await ClientDialogue.countDocuments({ outcome: 'converted' });
    const churnRisk = await ClientDialogue.countDocuments({ outcome: 'churn_risk' });
    const escalated = await ClientDialogue.countDocuments({ outcome: 'escalated' });

    // Топ интентов
    const intents = await ClientDialogue.aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.intent': { $ne: 'other' } } },
      { $group: { _id: '$messages.intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Конверсия по дням (последние 7 дней)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const daily = await ClientDialogue.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$outcome', 'converted'] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      summary: { total, converted, conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : 0, churnRisk, escalated },
      intents: intents.map(i => ({ intent: i._id, count: i.count })),
      daily
    });
  } catch (e) {
    console.error('[salesMetrics]', e.message);
    res.json({
      success: true,
      summary: { total: 0, converted: 0, conversionRate: 0, churnRisk: 0, escalated: 0 },
      intents: [],
      daily: []
    });
  }
});

export default router;
