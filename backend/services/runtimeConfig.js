import ExternalApiKey from '../models/ExternalApiKey.js';

// Runtime cache for decrypted keys (не хранить в логах!)
const runtimeCache = {};

export async function reloadApiKeys() {
  const keys = await ExternalApiKey.find({ isActive: true });
  runtimeCache.replicate = null;
  runtimeCache.elevenlabs = null;
  runtimeCache.openai_whisper = null;
  runtimeCache.openai = null;

  for (const k of keys) {
    try { runtimeCache[k.provider] = k.getDecryptedKey(); } catch(e) { console.error(`[RuntimeConfig] Failed to decrypt ${k.provider}`); }
  }
  console.log(`[RuntimeConfig] external keys loaded: ${keys.length} (cabinet keys via hot-reload in aiService)`);
  return runtimeCache;
}

export function getApiKey(provider) {
  // Priority: 1) Runtime DB cache, 2) ENV fallback
  return runtimeCache[provider] || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env[`${provider.toUpperCase()}_API_TOKEN`] || null;
}

export function hasApiKey(provider) {
  return !!getApiKey(provider);
}

// Auto-reload on startup
reloadApiKeys().catch(() => {});
