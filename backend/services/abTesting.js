import { createNode } from './cognitiveMesh.js';

const EXPERIMENTS = new Map();

export function createExperiment(name, variants, ownerId) {
  const exp = { id: `exp-${Date.now()}`, ownerId, name, variants: variants.map((v, i) => ({ id: `var-${i}`, content: v, traffic: 0, conversions: 0, views: 0 })), status: 'running', winner: null, createdAt: new Date() };
  EXPERIMENTS.set(exp.id, exp);
  return exp;
}

export function getVariantForUser(expId, userId, ownerId) {
  const exp = EXPERIMENTS.get(expId);
  if (!exp || exp.status !== 'running' || exp.ownerId !== ownerId) return null;
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return exp.variants[hash % exp.variants.length];
}

export function recordConversion(expId, variantId, ownerId) {
  const exp = EXPERIMENTS.get(expId);
  if (!exp || exp.ownerId !== ownerId) return;
  const v = exp.variants.find(v => v.id === variantId);
  if (v) v.conversions++;
}

export function recordView(expId, variantId, ownerId) {
  const exp = EXPERIMENTS.get(expId);
  if (!exp || exp.ownerId !== ownerId) return;
  const v = exp.variants.find(v => v.id === variantId);
  if (v) v.views++;
}

export function getExperimentResults(expId, ownerId) {
  const exp = EXPERIMENTS.get(expId);
  if (!exp || exp.ownerId !== ownerId) return null;
  return { ...exp, variantStats: exp.variants.map(v => ({ ...v, conversionRate: v.views > 0 ? (v.conversions / v.views * 100).toFixed(2) : 0 })) };
}

export function pickWinner(expId, ownerId) {
  const exp = EXPERIMENTS.get(expId);
  if (!exp || exp.ownerId !== ownerId) return null;
  const winner = exp.variants.sort((a, b) => (b.conversions / (b.views || 1)) - (a.conversions / (a.views || 1)))[0];
  exp.winner = winner.id;
  exp.status = 'completed';
  return winner;
}
