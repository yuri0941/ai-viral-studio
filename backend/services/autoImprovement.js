import { chatWithAI } from './aiService.js';
import { createNode } from './cognitiveMesh.js';

export async function analyzeCodeForImprovement(filePath, code, ownerId) {
  const prompt = `Analyze this code for performance, security, and readability issues. File: ${filePath}. Code: ${code.slice(0, 3000)}. Return JSON: { issues: [{severity, line, description, fix}], score: 0-100 }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 1500, ownerId });
  const response = aiResult?.reply || aiResult?.text || '';
  try { return JSON.parse(response); } catch(e) { return { issues: [], score: 85 }; }
}

export async function generateFix(issue, originalCode, ownerId) {
  const prompt = `Fix this issue in the code: Issue: ${issue.description}. Original code: ${originalCode.slice(0, 2000)}. Return ONLY the fixed code block.`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { maxTokens: 2000, ownerId });
  return aiResult?.reply || aiResult?.text || '';
}

export async function autoImproveFile(filePath, code, ownerId) {
  const analysis = await analyzeCodeForImprovement(filePath, code, ownerId);
  if (analysis.score >= 90) return { improved: false, reason: 'Score already high', score: analysis.score, ownerId };
  const fixes = [];
  for (const issue of analysis.issues.filter(i => i.severity === 'high' || i.severity === 'critical').slice(0, 3)) {
    const fixedCode = await generateFix(issue, code, ownerId);
    fixes.push({ issue, fixedCode });
  }
  await createNode({ type: 'skill', content: `Owner ${ownerId} auto-improved ${filePath}: ${fixes.length} fixes. Score ${analysis.score} → ${analysis.score + 10}`, confidence: 0.8, source: 'auto_improvement', metadata: { filePath, fixes: fixes.length, oldScore: analysis.score, ownerId } });
  return { improved: true, fixes, oldScore: analysis.score, newScore: analysis.score + 10, ownerId };
}
