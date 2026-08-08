import { chatWithAI } from './aiService.js';
import { createNode } from './cognitiveMesh.js';
import { orchestrate } from './agentSwarm.js';

const ROLES = ['CEO', 'CMO', 'CTO', 'CFO', 'CHRO'];

export async function generateBoardroomTasks(ownerId, context = {}) {
  const prompt = `As a board of directors (CEO, CMO, CTO, CFO, CHRO), analyze this context and generate specific tasks for each role. Context: ${JSON.stringify(context)}. Return JSON: { tasks: [{role, title, priority: 'critical'|'high'|'medium'|'low', description, deadline, expectedOutcome}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2500, temperature: 0.5 });
  const response = aiResult?.reply || aiResult?.text || '';
  let tasks;
  try { tasks = JSON.parse(response).tasks; } catch(e) { tasks = []; }

  await createNode({ type: 'decision', content: `Boardroom auto-tasks for owner ${ownerId}: ${tasks.length} tasks`, confidence: 0.85, source: 'boardroom_auto_task', metadata: { ownerId, tasks, type: 'boardroom_tasks' } });
  return tasks;
}

export async function executeBoardroomVote(tasks, ownerId) {
  const votePrompt = `Board vote on these tasks: ${JSON.stringify(tasks)}. Return JSON: { votes: [{role, taskIndex, vote: 'approve'|'reject'|'modify', reasoning}] }`;
  const aiResult = await chatWithAI(votePrompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.4 });
  const response = aiResult?.reply || aiResult?.text || '';
  let votes;
  try { votes = JSON.parse(response).votes; } catch(e) { votes = tasks.map((_, i) => ({ role: 'CEO', taskIndex: i, vote: 'approve', reasoning: 'Auto-approved' })); }

  const approved = tasks.filter((_, i) => votes.filter(v => v.taskIndex === i && v.vote === 'approve').length >= 3);
  const rejected = tasks.filter((_, i) => votes.filter(v => v.taskIndex === i && v.vote === 'reject').length >= 3);

  await createNode({ type: 'decision', content: `Boardroom vote: ${approved.length} approved, ${rejected.length} rejected`, confidence: 0.9, source: 'boardroom_auto_task', metadata: { ownerId, approved, rejected, votes, type: 'boardroom_vote' } });
  return { approved, rejected, votes };
}

export async function runBoardroomCycle(ownerId, context) {
  const tasks = await generateBoardroomTasks(ownerId, context);
  const vote = await executeBoardroomVote(tasks, ownerId);

  if (vote.approved.length > 0) {
    const workerTasks = vote.approved.map(t => ({
      role: t.role.toLowerCase(),
      specialization: t.title,
      type: 'generate_text',
      prompt: `Execute task: ${t.title}. ${t.description}. Expected outcome: ${t.expectedOutcome}`,
      fallback: `Task ${t.title} queued for manual review`
    }));
    orchestrate(workerTasks).catch(() => {});
  }

  return { tasks, vote, queued: vote.approved.length };
}
