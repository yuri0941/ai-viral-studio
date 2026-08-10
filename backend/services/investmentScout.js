import { chatWithAI, extractText } from './aiService.js';
import { createNode } from './cognitiveMesh.js';

export async function generatePitchDeck(projectName, description, metrics, ownerId) {
  const prompt = `Generate a pitch deck for "${projectName}". Description: ${description}. Metrics: ${JSON.stringify(metrics)}. Return JSON sections: { problem, solution, marketSize, businessModel, traction, team, financials, ask, useOfFunds }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 3000, temperature: 0.5 });
  const response = extractText(aiResult);
  try {
    const deck = JSON.parse(response);
    await createNode({ type: 'project', content: `Pitch deck generated for ${projectName}`, confidence: 0.9, source: 'investment_scout', metadata: { ownerId, projectName, deck, type: 'pitch_deck' } });
    return deck;
  } catch(e) { return { sections: [], mock: true }; }
}

export async function findInvestorMatches(projectName, niche, stage = 'pre-seed', ownerId) {
  const prompt = `Suggest 5 ideal investor profiles for ${projectName} in ${niche} at ${stage} stage. Return JSON: { investors: [{type, focus, checkSize, valueAdd, contactStrategy}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 1500, temperature: 0.4 });
  const response = extractText(aiResult);
  try { return JSON.parse(response); } catch(e) { return { investors: [], mock: true }; }
}

export async function generateSAFENote(amount, valuationCap, discount, ownerId) {
  const prompt = `Generate a SAFE note template for $${amount} with ${valuationCap} cap and ${discount}% discount. Return JSON: { title, sections: [{heading, content}], keyTerms: [{term, explanation}] }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON. This is a template, not legal advice.', maxTokens: 2000, temperature: 0.3 });
  const response = extractText(aiResult);
  try { return JSON.parse(response); } catch(e) { return { template: 'SAFE note template placeholder', mock: true }; }
}

export async function generateNegotiationScript(investorType, offerAmount, ownerId) {
  const prompt = `Generate a negotiation script for meeting with ${investorType} for $${offerAmount}. Return JSON: { opening, keyPoints: [{point, response}], objections: [{objection, rebuttal}], closing, followUp }`;
  const aiResult = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 2000, temperature: 0.6 });
  const response = extractText(aiResult);
  try { return JSON.parse(response); } catch(e) { return { script: 'Negotiation script placeholder', mock: true }; }
}
