// [AI-MODELS-HOTSWAP] Centralized AI model IDs.
// Override via env in Render without redeploying code.
export const AI_MODELS = {
  // Groq main slot (kept stable; override if Groq changes it)
  GROQ_MODEL_MAIN: process.env.GROQ_MODEL_MAIN || 'llama-3.3-70b-versatile',
  // Groq fast/last-resort slot (was llama-3.1-8b-instant, deprecated 2026-08-16)
  GROQ_MODEL_FAST: process.env.GROQ_MODEL_FAST || 'openai/gpt-oss-20b',
  // OpenRouter free primary (was google/gemini-2.0-flash-exp:free)
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free',
  // OpenRouter free backup if primary is pulled
  OPENROUTER_MODEL_BACKUP: process.env.OPENROUTER_MODEL_BACKUP || 'nvidia/nemotron-3-super-120b-a12b:free',
}

export default AI_MODELS
