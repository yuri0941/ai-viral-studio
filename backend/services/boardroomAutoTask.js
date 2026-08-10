import { chatWithAI, extractText } from './aiService.js';
import { createNode } from './cognitiveMesh.js';
import { orchestrate } from './agentSwarm.js';

const ROLES = ['CEO', 'CMO', 'CTO', 'CFO', 'CHRO'];

export async function generateBoardroomTasks(ownerId, context = {}) {
  const prompt = `As a board of directors (CEO, CMO, CTO, CFO, CHRO), analyze this context and generate specific tasks for each role. Context: ${JSON.stringify(context)}. Return JSON: { tasks: [{role, title, priority: 'critical'|'high'|'medium'|'low', description, deadline, expectedOutcome}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2500, temperature: 0.5 });
  const response = extractText(aiResult);
  let tasks;
  try { tasks = JSON.parse(response).tasks; } catch(e) { tasks = []; }

  await createNode({ type: 'decision', content: `Boardroom auto-tasks for owner ${ownerId}: ${tasks.length} tasks`, confidence: 0.85, source: 'boardroom_auto_task', metadata: { ownerId, tasks, type: 'boardroom_tasks' } });
  return tasks;
}

export async function executeBoardroomVote(tasks, ownerId) {
  const votePrompt = `Board vote on these tasks: ${JSON.stringify(tasks)}. Return JSON: { votes: [{role, taskIndex, vote: 'approve'|'reject'|'modify', reasoning}] }`;
  const aiResult = await chatWithAI(votePrompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.4 });
  const response = extractText(aiResult);
  let votes;
  try { votes = JSON.parse(response).votes; } catch(e) { votes = tasks.map((_, i) => ({ role: 'CEO', taskIndex: i, vote: 'approve', reasoning: 'Auto-approved' })); }

  const approved = tasks.filter((_, i) => votes.filter(v => v.taskIndex === i && v.vote === 'approve').length >= 3);
  const rejected = tasks.filter((_, i) => votes.filter(v => v.taskIndex === i && v.vote === 'reject').length >= 3);

  await createNode({ type: 'decision', content: `Boardroom vote: ${approved.length} approved, ${rejected.length} rejected`, confidence: 0.9, source: 'boardroom_auto_task', metadata: { ownerId, approved, rejected, votes, type: 'boardroom_vote' } });
  return { approved, rejected, votes };
}

export async function runBoardroomCycle(ownerId, context) {
  const agents = [
    { role: 'CEO', name: 'Алексей (CEO)', stance: 'strategy', icon: '👔' },
    { role: 'CMO', name: 'Мария (CMO)', stance: 'marketing', icon: '📢' },
    { role: 'CTO', name: 'Дмитрий (CTO)', stance: 'tech', icon: '💻' },
    { role: 'CFO', name: 'Анна (CFO)', stance: 'finance', icon: '💰' },
    { role: 'CHRO', name: 'Иван (CHRO)', stance: 'people', icon: '🤝' }
  ]

  const votes = []
  for (const agent of agents) {
    const prompt = `You are ${agent.name} of AI Viral Studio. Context: "${context || 'No context provided'}".
Question: Should we proceed? Analyze and vote: FOR / AGAINST / ABSTAIN.
Write a brief comment (2-3 sentences in Russian) explaining your position and suggest ONE specific improvement.
Return JSON: { vote: "FOR"|"AGAINST"|"ABSTAIN", comment: "...", improvement: "..." }`
    const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 400, temperature: 0.7 })
    let voteData
    try {
      voteData = JSON.parse(extractText(aiResult) || '{}')
    } catch (e) {
      voteData = { vote: 'ABSTAIN', comment: 'Воздерживаюсь.', improvement: 'Нет предложений.' }
    }
    votes.push({ ...agent, vote: voteData.vote || 'ABSTAIN', comment: voteData.comment || '—', improvement: voteData.improvement || '', timestamp: new Date() })
  }

  const forCount = votes.filter(v => v.vote === 'FOR').length
  const againstCount = votes.filter(v => v.vote === 'AGAINST').length
  const consensus = forCount >= 4

  const improvements = votes.map(v => v.improvement).filter(Boolean)
  const summary = `Голосование: ${forCount} ЗА, ${againstCount} ПРОТИВ, ${votes.length - forCount - againstCount} воздержались.`

  // Generate tasks for compatibility with existing UI
  const tasks = await generateBoardroomTasks(ownerId, context).catch(() => [])

  if (consensus && tasks.length > 0) {
    const workerTasks = tasks.slice(0, 3).map(t => ({
      role: t.role.toLowerCase(),
      specialization: t.title,
      type: 'generate_text',
      prompt: `Execute task: ${t.title}. ${t.description}. Expected outcome: ${t.expectedOutcome}`,
      fallback: `Task ${t.title} queued for manual review`
    }))
    orchestrate(workerTasks).catch(() => {})
  }

  await createNode({ type: 'decision', content: `Boardroom vote: ${summary}`, confidence: 0.9, source: 'boardroom_auto_task', metadata: { ownerId, votes, improvements, consensus, context, type: 'boardroom_vote' } })

  return { consensus, votes, summary, improvements, context, tasks, queued: consensus ? 1 : 0, createdAt: new Date() }
}
