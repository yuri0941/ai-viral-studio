import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { generateProject, deployProject, runQualityChecks } from '../services/projectFactory.js';
import { autoImproveFile } from '../services/autoImprovement.js';
import { createExperiment, getExperimentResults, pickWinner } from '../services/abTesting.js';

const router = Router();

// ВСЕ роуты — только owner/admin (это разработка владельца, не клиентская фича)
router.post('/generate', protect, requireRole('owner','admin'), async (req, res) => {
  const { type, name, description, niche, style } = req.body;
  const result = await generateProject({ type, name, description, niche, style, ownerId: req.user._id });
  res.json(result);
});

router.post('/deploy', protect, requireRole('owner','admin'), async (req, res) => {
  const { variant, platform } = req.body;
  const deploy = await deployProject(variant, platform || 'render', req.user._id);
  res.json(deploy);
});

router.post('/quality-check', protect, requireRole('owner','admin'), async (req, res) => {
  const { project } = req.body;
  const checks = await runQualityChecks(project, req.user._id);
  res.json(checks);
});

router.post('/auto-improve', protect, requireRole('owner','admin'), async (req, res) => {
  const { filePath, code } = req.body;
  const result = await autoImproveFile(filePath, code, req.user._id);
  res.json(result);
});

router.post('/ab-test/create', protect, requireRole('owner','admin'), async (req, res) => {
  const { name, variants } = req.body;
  const exp = createExperiment(name, variants, req.user._id);
  res.json(exp);
});

router.get('/ab-test/:id/results', protect, requireRole('owner','admin'), async (req, res) => {
  const results = getExperimentResults(req.params.id, req.user._id);
  res.json(results);
});

router.post('/ab-test/:id/winner', protect, requireRole('owner','admin'), async (req, res) => {
  const winner = pickWinner(req.params.id, req.user._id);
  res.json({ winner, status: 'completed' });
});

export default router;
