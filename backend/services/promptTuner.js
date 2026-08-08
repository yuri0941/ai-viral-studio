import { createNode } from './cognitiveMesh.js'
import { chatWithAI } from './aiService.js'

const PROMPT_REGISTRY = new Map()

export function registerPrompt(name, template, metadata = {}) {
  PROMPT_REGISTRY.set(name, { template, version: 1, successCount: 0, failCount: 0, lastTuned: new Date(), metadata })
}

export function recordOutcome(name, success = true) {
  const p = PROMPT_REGISTRY.get(name)
  if (!p) return
  if (success) p.successCount++
  else p.failCount++
}

export async function tunePrompt(name, ownerId) {
  const p = PROMPT_REGISTRY.get(name)
  if (!p) return null
  const total = p.successCount + p.failCount
  if (total < 5) return null
  const successRate = p.successCount / total
  if (successRate > 0.8) return null
  const prompt = `Improve this system prompt. Current: "${p.template}". Success rate: ${(successRate * 100).toFixed(0)}%. Make it more actionable, concise, and result-oriented. Return ONLY the new prompt text.`
  const aiResult = await chatWithAI(prompt, [], 'ru', { maxTokens: 1500, temperature: 0.4 })
  const newTemplate = aiResult?.reply || aiResult?.text || p.template
  p.template = newTemplate
  p.version++
  p.lastTuned = new Date()
  p.successCount = 0
  p.failCount = 0
  await createNode({ type: 'skill', content: `Prompt ${name} tuned to v${p.version}`, confidence: 0.9, source: 'prompt_tuner', metadata: { ownerId, name, version: p.version, type: 'prompt_tuned' } })
  return { name, version: p.version, template: newTemplate }
}

export function getPromptStats() {
  return Array.from(PROMPT_REGISTRY.entries()).map(([name, p]) => ({
    name,
    version: p.version,
    successRate: p.successCount / (p.successCount + p.failCount || 1),
    lastTuned: p.lastTuned
  }))
}

// Seed default prompts
registerPrompt('omega-chat', 'You are OMEGA, a helpful AI assistant for AI Viral Studio. Be concise, actionable, and result-oriented.')
registerPrompt('owner-reply', 'You are the owner assistant bot for AI Viral Studio. Use luxury, concise Russian replies. Suggest one clear next action.')
registerPrompt('content-generation', 'Generate viral, platform-native content in Russian. Include hook, body, CTA, and hashtags.')
