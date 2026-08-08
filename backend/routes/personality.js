import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { analyzeOwnerStyle, generateInOwnerStyle, shouldChallengeOwner } from '../services/personalityEngine.js';
import { cloneVoice, getClonedVoices } from '../services/voiceCloneService.js';
import { logDecision, getDecisionHistory, updateDecisionOutcome } from '../services/omegaDiary.js';
import { nightShift, generateMorningBriefing } from '../services/dreamMode.js';

const router = Router();

router.post('/personality/analyze', protect, requireRole('owner'), async (req, res) => {
  const profile = await analyzeOwnerStyle(req.user._id, req.body.messages);
  res.json({ profile, status: 'analyzed' });
});

router.post('/personality/rewrite', protect, requireRole('owner'), async (req, res) => {
  const { text } = req.body;
  const rewritten = await generateInOwnerStyle(text, req.user._id);
  res.json({ original: text, rewritten, status: 'rewritten' });
});

router.post('/personality/challenge', protect, requireRole('owner'), async (req, res) => {
  const { decision, context } = req.body;
  const challenge = await shouldChallengeOwner(decision, context);
  res.json(challenge);
});

router.post('/voice/clone', protect, requireRole('owner'), async (req, res) => {
  const { audioSample, name } = req.body;
  const result = await cloneVoice(audioSample, name);
  res.json(result);
});

router.get('/voice/cloned', protect, requireRole('owner'), async (req, res) => {
  const voices = await getClonedVoices();
  res.json(voices);
});

router.post('/diary/log', protect, requireRole('owner'), async (req, res) => {
  const { decision, context, result } = req.body;
  const entry = await logDecision(decision, context, result, req.user._id);
  res.json({ entry, status: 'logged' });
});

router.get('/diary/history', protect, requireRole('owner'), async (req, res) => {
  const history = await getDecisionHistory(req.user._id, parseInt(req.query.limit) || 50);
  res.json({ history, count: history.length });
});

router.post('/diary/:id/outcome', protect, requireRole('owner'), async (req, res) => {
  const { outcome, lessons } = req.body;
  await updateDecisionOutcome(req.params.id, outcome, lessons);
  res.json({ status: 'updated' });
});

router.post('/dream/night-shift', protect, requireRole('owner'), async (req, res) => {
  const report = await nightShift(req.user._id);
  res.json({ report, status: 'completed' });
});

router.get('/dream/morning-briefing', protect, requireRole('owner'), async (req, res) => {
  const briefing = await generateMorningBriefing(req.user._id);
  res.json(briefing);
});

export default router;
