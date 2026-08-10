import { createNode, queryMesh } from './cognitiveMesh.js';
import { chatWithAI, extractText } from './aiService.js';

export async function analyzeOwnerStyle(ownerId, messages = []) {
  if (messages.length === 0) {
    const history = await queryMesh(`owner:${ownerId}`, 50, 0.5);
    messages = history.map(h => h.content).filter(Boolean);
  }
  const sample = messages.slice(-100).join('\n---\n');
  const prompt = `Analyze the writing style of the following messages. Extract: 1.Tone (formal/casual/energetic/calm) 2.Common phrases and fillers 3.Humor style (sarcastic/playful/serious/none) 4.Emoji usage pattern 5.Average sentence length 6.Preferred greeting 7.Preferred farewell 8.Decision-making style (analytical/intuitive/aggressive/cautious). Return ONLY valid JSON: { tone, phrases, humor, emojiPattern, sentenceLength, greeting, farewell, decisionStyle }`;
  // [v9.9.19.3] FIX: options были вторым аргументом (history) + JSON.parse на объекте
  const analysis = extractText(await chatWithAI(prompt, [], 'ru', { system: 'You are a linguistic analyst. Return ONLY valid JSON.', maxTokens: 800 }));
  let profile;
  try { profile = JSON.parse(analysis.match(/\{[\s\S]*\}/)?.[0] || analysis); } catch(e) { profile = {}; }
  await createNode({ type: 'skill', content: `Personality profile for owner ${ownerId}: ${JSON.stringify(profile)}`, confidence: 0.85, source: 'personality_engine', metadata: { ownerId, profile, type: 'personality_profile' } });
  return profile;
}

export async function generateInOwnerStyle(text, ownerId, profile = null) {
  if (!profile) {
    const nodes = await queryMesh(`personality_profile owner:${ownerId}`, 5, 0.7);
    profile = nodes[0]?.metadata?.profile || {};
  }
  const prompt = `Rewrite the following text in this specific style: Tone:${profile.tone||'casual'}, Humor:${profile.humor||'playful'}, Emoji:${profile.emojiPattern||'moderate'}, Greeting:${profile.greeting||'Hey'}, Style:${profile.decisionStyle||'balanced'}. Original text:"${text}". Rewrite maintaining the same meaning but in the owner's personal style.`;
  return extractText(await chatWithAI(prompt, [], 'ru', { temperature: 0.7, maxTokens: 1500 }));
}

export async function shouldChallengeOwner(decision, context) {
  const prompt = `As an AI advisor, evaluate this decision: Decision:"${decision}" Context:"${context}". Is this decision likely to cause harm, financial loss, or reputational damage? If yes, suggest a better alternative and explain why. Return ONLY valid JSON: { shouldChallenge: boolean, reason: string, alternative: string, confidence: 0-1 }`;
  const response = extractText(await chatWithAI(prompt, [], 'ru', { system: 'You are a cautious but constructive advisor. Return ONLY valid JSON.', maxTokens: 600 }));
  try { return JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || response); } catch(e) { return { shouldChallenge: false }; }
}
