import { createNode } from './cognitiveMesh.js';

export async function logDecision(decision, context, result, ownerId) {
  const entry = { timestamp: new Date(), decision, context: context.slice(0, 500), result: result.slice(0, 500), ownerId, outcome: 'pending', lessons: [] };
  await createNode({ type: 'decision', content: `Decision: ${decision}. Context: ${context}. Result: ${result}`, confidence: 0.9, source: 'omega_diary', metadata: { entry, type: 'decision_log' } });
  return entry;
}

export async function updateDecisionOutcome(decisionId, outcome, lessons = []) {
  const Node = (await import('mongoose')).model('CognitiveNode');
  await Node.findByIdAndUpdate(decisionId, { $set: { 'metadata.entry.outcome': outcome, 'metadata.entry.lessons': lessons, 'metadata.entry.updatedAt': new Date() } });
}

export async function getDecisionHistory(ownerId, limit = 50) {
  const Node = (await import('mongoose')).model('CognitiveNode');
  return await Node.find({ type: 'decision', 'metadata.entry.ownerId': ownerId }).sort({ createdAt: -1 }).limit(limit).lean();
}
