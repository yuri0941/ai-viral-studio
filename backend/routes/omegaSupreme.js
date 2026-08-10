import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { getSwarmStatus, orchestrate, spawnWorker } from '../services/agentSwarm.js';
import { queryMesh, getRelated, pruneMesh, findNodes } from '../services/cognitiveMesh.js';
import { storeMemory, recallMemory, compressAndArchive } from '../services/infiniteMemory.js';
import { evaluateMigration, autoScaleDecision, scanServerPrices } from '../services/autoScaler.js';
import { getBalance, getTransactionHistory } from '../services/cryptoWallet.js';
import { detectIntent } from '../ai/omega/intentEngine.js';
import { getSkillStatus } from '../ai/omega/learningEngine.js';
import { chatWithAI } from '../services/aiService.js';
import { getDreamStatus } from '../services/dreamMode.js';
import { generateVoice } from '../services/voiceService.js';
import { GeneratedCode } from '../models/index.js';

const router = Router();

router.get('/mesh/query', protect, async (req, res) => {
  const { q, limit = 20 } = req.query;
  const results = await queryMesh(q, parseInt(limit));
  res.json({ query: q, results, count: results.length });
});

router.get('/mesh/related/:nodeId', protect, async (req, res) => {
  const results = await getRelated(req.params.nodeId, 2);
  res.json({ nodeId: req.params.nodeId, related: results });
});

// [v9.9.14-OMEGA-AUTONOMY] Neural Graph nodes endpoint
router.get('/mesh/nodes', protect, async (req, res) => {
  const { type, label, limit = 50 } = req.query;
  const nodes = await findNodes({ type, label, limit: parseInt(limit) || 50 });
  res.json({ nodes, count: nodes.length });
});

router.get('/swarm/status', protect, requireRole('owner','admin'), async (req, res) => {
  res.json(getSwarmStatus());
});

router.post('/swarm/orchestrate', protect, requireRole('owner','admin'), async (req, res) => {
  const { tasks } = req.body;
  const results = await orchestrate(tasks || []);
  res.json({ results, completed: results.filter(r => r.success).length });
});

router.post('/swarm/spawn', protect, requireRole('owner','admin'), async (req, res) => {
  const { role, specialization, params } = req.body;
  const worker = spawnWorker(role, specialization, params);
  res.json({ workerId: worker.id, status: 'spawned' });
});

router.post('/memory/store', protect, async (req, res) => {
  const { layer, data } = req.body;
  const result = await storeMemory(layer, data);
  res.json({ stored: true, result });
});

router.get('/memory/recall', protect, async (req, res) => {
  const { q, layers, limit } = req.query;
  const results = await recallMemory(q, { layers: layers?.split(','), limit: parseInt(limit) || 10 });
  res.json({ query: q, results });
});

router.get('/scale/status', protect, requireRole('owner','admin'), async (req, res) => {
  const migration = await evaluateMigration();
  res.json(migration);
});

router.get('/scale/prices', protect, requireRole('owner','admin'), async (req, res) => {
  const prices = await scanServerPrices();
  res.json(prices);
});

router.get('/wallet/balance', protect, requireRole('owner','admin'), async (req, res) => {
  res.json(await getBalance());
});

router.get('/wallet/history', protect, requireRole('owner','admin'), async (req, res) => {
  res.json(getTransactionHistory());
});

// [v9.9.13-OMEGA-SUPREME] Intent + Skill API
router.get('/intent', protect, (req, res) => {
  res.json(detectIntent(req.query.q || ''));
});

router.get('/skills/:action', protect, async (req, res) => {
  res.json(await getSkillStatus(req.params.action));
});

// [v9.9.15-REAL] Voice TTS via ElevenLabs
router.post('/voice/speak', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const result = await generateVoice(text);
    if (result.fallback) return res.json({ fallback: true, message: 'Используйте Web Speech API в браузере' });
    res.json({ audio: result.audio, format: result.format });
  } catch (e) {
    res.status(500).json({ fallback: true, message: e.message });
  }
});

// [v9.9.15-REAL] Dream Mode status + real ideas
router.get('/dream/status', protect, async (req, res) => {
  try { res.json(await getDreamStatus()); }
  catch (e) { res.json({ active: false, lastBriefing: null, ideas: [], error: e.message }); }
});

// [v9.9.15-REAL] OMEGA DevStudio — real AI code generation
router.post('/devstudio/generate', protect, async (req, res) => {
  try {
    const { spec, language = 'javascript' } = req.body;
    if (!spec) return res.status(400).json({ error: 'spec is required' });
    const prompt = `Ты senior full-stack разработчик. Напиши production-ready ${language} код для следующей задачи. Используй современный синтаксис, добавь комментарии, обработку ошибок. НЕ используй placeholder или "TODO" — только рабочий код.\n\nЗадача: ${spec}\n\nНапиши полный ${language} код:`;
    const ai = await chatWithAI(prompt, [], 'ru', { userId: req.user._id });
    const code = ai?.reply || ai;
    const saved = await GeneratedCode.create({ ownerId: req.user._id, spec, code, language, status: 'pending' });
    res.json({ code, id: saved._id, spec });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/devstudio/approve', protect, async (req, res) => {
  try {
    const { id } = req.body;
    await GeneratedCode.findByIdAndUpdate(id, { status: 'approved' });
    res.json({ success: true, message: 'Код одобрен. Примените вручную через Kimi VS Code или скопируйте в проект.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// [v9.9.19-HOTFIX] Memory compression endpoint
router.post('/memory/compress', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    let freed = 0;
    try {
      const result = await compressAndArchive?.();
      freed = result?.freed || 0;
    } catch (e) {
      console.warn('[omegaSupreme/memory/compress] compress failed:', e.message);
    }
    res.json({
      success: true,
      message: 'Memory compression initiated',
      freed,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
