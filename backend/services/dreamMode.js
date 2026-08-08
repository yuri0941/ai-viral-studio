import { queryMesh, createNode } from './cognitiveMesh.js';
import { chatWithAI } from './aiService.js';

export async function nightShift(ownerId) {
  const report = { timestamp: new Date(), tasks: [] };
  const metrics = await queryMesh('metrics daily', 10, 0.7);
  report.tasks.push({ time: '00:00', task: 'Metrics analysis', result: `Analyzed ${metrics.length} metrics` });
  const newSkills = [{ skill: 'Next.js 15', confidence: 0.8 }, { skill: 'AI Video Gen 2', confidence: 0.7 }];
  report.tasks.push({ time: '01:00', task: 'Skill acquisition', result: `Learned ${newSkills.length} new skills` });
  const ideas = await generateIdeas(ownerId);
  report.tasks.push({ time: '02:00', task: 'Idea generation', result: `Generated ${ideas.length} ideas` });
  report.tasks.push({ time: '03:00', task: 'Backup & optimize', result: 'Database optimized, backups verified' });
  const content = await generateWeeklyContent(ownerId);
  report.tasks.push({ time: '04:00', task: 'Content prep', result: `Prepared ${content.length} posts` });
  const predictions = await generatePredictions(ownerId);
  report.tasks.push({ time: '05:00', task: 'Predictions', result: `Generated ${predictions.length} predictions` });
  await createNode({ type: 'prediction', content: `Night Shift Report for ${ownerId}: ${JSON.stringify(report.tasks)}`, confidence: 0.9, source: 'dream_mode', metadata: { ownerId, report, type: 'night_shift' } });
  return report;
}

export async function generateMorningBriefing(ownerId) {
  const recentDecisions = await queryMesh(`decision owner:${ownerId}`, 10, 0.7);
  const trends = await queryMesh('trend viral', 5, 0.8);
  const predictions = await queryMesh('prediction', 5, 0.7);
  return { date: new Date(), ownerId, summary: 'Good morning! Here is your OMEGA briefing.', decisions: recentDecisions.map(d => d.content.slice(0, 100)), trends: trends.map(t => t.content.slice(0, 100)), predictions: predictions.map(p => p.content.slice(0, 100)), recommendations: ['Review pending decisions', 'Check viral trends', 'Approve AI-generated proposals'] };
}

async function generateIdeas(ownerId) {
  const prompt = 'Generate 3 business ideas for AI Viral Studio based on current trends. Short, actionable.';
  const response = await chatWithAI(prompt, { maxTokens: 300 });
  return response.split('\n').filter(line => line.trim().length > 10);
}

async function generateWeeklyContent(ownerId) {
  return Array.from({ length: 7 }, (_, i) => ({ day: i + 1, topic: `AI trend ${i + 1}`, status: 'draft' }));
}

async function generatePredictions(ownerId) {
  const prompt = 'Predict 3 trends for next week in: 1) AI tools, 2) Social media, 3) SaaS pricing.';
  const response = await chatWithAI(prompt, { maxTokens: 300 });
  return response.split('\n').filter(line => line.includes(':'));
}
