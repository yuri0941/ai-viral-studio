import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { detectPsychotype, generateSalesContent } from '../services/neuroSales.js';

const router = Router();

// [P18] added: Neuro-Sales psychotype analysis
router.post('/analyze', protect, async (req, res) => {
  try {
    const { chatHistory, sampleText, product, goal } = req.body || {};
    const history = chatHistory || (sampleText ? [{ text: sampleText }] : []);

    const analysis = await detectPsychotype(history);
    const content = await generateSalesContent(analysis.psychotype, product || 'продукт', goal || 'продажа');

    return res.json({
      success: true,
      data: {
        psychotype: analysis.psychotype,
        confidence: analysis.confidence,
        scores: analysis.scores,
        reasoning: analysis.reasoning,
        recommendation: content,
      },
    });
  } catch (err) {
    console.error('[neuroSales:analyze]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
