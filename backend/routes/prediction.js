import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { scanViralTrends, analyzeStockOpportunity, analyzeCryptoOpportunity, findBusinessNiche, generateWeeklyForecast } from '../services/predictionEngine.js';
import { generatePitchDeck, findInvestorMatches, generateSAFENote, generateNegotiationScript } from '../services/investmentScout.js';
import { runBoardroomCycle, generateBoardroomTasks } from '../services/boardroomAutoTask.js';

const router = Router();

// Predictions
router.get('/trends', protect, requireRole('owner','admin'), async (req, res) => {
  const { niche, horizon } = req.query;
  const data = await scanViralTrends(niche, horizon);
  res.json(data);
});

router.post('/stock', protect, requireRole('owner','admin'), async (req, res) => {
  const { ticker } = req.body;
  const data = await analyzeStockOpportunity(ticker, req.user._id);
  res.json(data);
});

router.post('/crypto', protect, requireRole('owner','admin'), async (req, res) => {
  const { coin } = req.body;
  const data = await analyzeCryptoOpportunity(coin, req.user._id);
  res.json(data);
});

router.get('/niches', protect, requireRole('owner','admin'), async (req, res) => {
  const { budget } = req.query;
  const data = await findBusinessNiche(req.user._id, parseInt(budget) || 1000);
  res.json(data);
});

router.get('/forecast', protect, requireRole('owner','admin'), async (req, res) => {
  const data = await generateWeeklyForecast(req.user._id);
  res.json(data);
});

// Investment
router.post('/pitch-deck', protect, requireRole('owner','admin'), async (req, res) => {
  const { projectName, description, metrics } = req.body;
  const data = await generatePitchDeck(projectName, description, metrics, req.user._id);
  res.json(data);
});

router.post('/investor-match', protect, requireRole('owner','admin'), async (req, res) => {
  const { projectName, niche, stage } = req.body;
  const data = await findInvestorMatches(projectName, niche, stage, req.user._id);
  res.json(data);
});

router.post('/safe-note', protect, requireRole('owner','admin'), async (req, res) => {
  const { amount, valuationCap, discount } = req.body;
  const data = await generateSAFENote(amount, valuationCap, discount, req.user._id);
  res.json(data);
});

router.post('/negotiation-script', protect, requireRole('owner','admin'), async (req, res) => {
  const { investorType, offerAmount } = req.body;
  const data = await generateNegotiationScript(investorType, offerAmount, req.user._id);
  res.json(data);
});

// Boardroom
router.post('/boardroom/run', protect, requireRole('owner','admin'), async (req, res) => {
  const { context } = req.body;
  const data = await runBoardroomCycle(req.user._id, context);
  res.json(data);
});

router.get('/boardroom/tasks', protect, requireRole('owner','admin'), async (req, res) => {
  const tasks = await generateBoardroomTasks(req.user._id, req.query);
  res.json({ tasks });
});

export default router;
