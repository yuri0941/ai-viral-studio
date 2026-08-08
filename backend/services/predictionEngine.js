import { chatWithAI } from './aiService.js';
import { createNode, queryMesh } from './cognitiveMesh.js';

export async function scanViralTrends(niche = 'all', horizon = '7d') {
  const prompt = `Analyze current viral trends for ${niche} on TikTok, YouTube Shorts, Instagram Reels, Twitter/X. Horizon: ${horizon}. Return JSON: { trends: [{platform, topic, growthScore, audience, contentFormat, bestPostTime, hashtags, riskLevel}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON. No markdown.', maxTokens: 2000, temperature: 0.3 });
  const response = aiResult?.reply || aiResult?.text || '';
  try { return JSON.parse(response); } catch(e) { return { trends: [], mock: true }; }
}

export async function analyzeStockOpportunity(ticker, ownerId) {
  const prompt = `Analyze ${ticker} stock. Return JSON: { signal: 'buy'|'hold'|'sell', confidence: 0-1, targetPrice, stopLoss, timeframe, reasoning, riskLevel }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON. This is educational analysis, not financial advice.', maxTokens: 1500, temperature: 0.2 });
  const response = aiResult?.reply || aiResult?.text || '';
  try { 
    const data = JSON.parse(response);
    await createNode({ type: 'prediction', content: `Stock ${ticker}: ${data.signal} @ ${data.targetPrice}`, confidence: data.confidence, source: 'prediction_engine', metadata: { ownerId, ticker, ...data, type: 'stock_signal' } });
    return data; 
  } catch(e) { return { signal: 'hold', confidence: 0.5, mock: true }; }
}

export async function analyzeCryptoOpportunity(coin, ownerId) {
  const prompt = `Analyze ${coin} cryptocurrency. Return JSON: { signal: 'buy'|'hold'|'sell', confidence: 0-1, targetPrice, stopLoss, timeframe, reasoning, riskLevel }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON. Educational only.', maxTokens: 1500, temperature: 0.2 });
  const response = aiResult?.reply || aiResult?.text || '';
  try {
    const data = JSON.parse(response);
    await createNode({ type: 'prediction', content: `Crypto ${coin}: ${data.signal} @ ${data.targetPrice}`, confidence: data.confidence, source: 'prediction_engine', metadata: { ownerId, coin, ...data, type: 'crypto_signal' } });
    return data;
  } catch(e) { return { signal: 'hold', confidence: 0.5, mock: true }; }
}

export async function findBusinessNiche(ownerId, budget = 1000) {
  const prompt = `Find 3 underserved business niches for a $${budget} budget. Return JSON: { niches: [{name, demandScore, competitionScore, startupCost, timeToRevenue, recommendedChannels, viralPotential}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.4 });
  const response = aiResult?.reply || aiResult?.text || '';
  try { return JSON.parse(response); } catch(e) { return { niches: [], mock: true }; }
}

export async function generateWeeklyForecast(ownerId) {
  const trends = await scanViralTrends();
  const niche = await findBusinessNiche(ownerId);
  const recentDecisions = await queryMesh(`decision owner:${ownerId}`, 5, 0.7);
  return {
    week: new Date(),
    ownerId,
    viralTrends: trends.trends?.slice(0, 5) || [],
    businessNiches: niche.niches?.slice(0, 3) || [],
    pendingDecisions: recentDecisions.map(d => d.content.slice(0, 100)),
    recommendations: [
      'Review viral trends for content opportunities',
      'Evaluate business niches against current capacity',
      'Check pending decisions from last week'
    ]
  };
}
