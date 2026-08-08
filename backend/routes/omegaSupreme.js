import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { getSwarmStatus, orchestrate, spawnWorker } from '../services/agentSwarm.js';
import { queryMesh, getRelated, pruneMesh } from '../services/cognitiveMesh.js';
import { storeMemory, recallMemory, compressAndArchive } from '../services/infiniteMemory.js';
import { evaluateMigration, autoScaleDecision, scanServerPrices } from '../services/autoScaler.js';
import { getBalance, getTransactionHistory } from '../services/cryptoWallet.js';

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

export default router;
