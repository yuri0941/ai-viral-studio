import express from 'express';
import { saveFeedback, rateFeedback, getFeedbackStats } from '../services/feedbackService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { message, response, context } = req.body;
    const fb = await saveFeedback({ userId: String(req.user._id), role: req.user.role, message, response, context });
    res.json({ id: fb._id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating } = req.body;
    await rateFeedback(req.params.id, rating);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    res.json(await getFeedbackStats(req.query.days || 7));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
