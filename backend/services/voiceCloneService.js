import { getApiKey, hasApiKey } from './runtimeConfig.js';

const ELEVENLABS_API_KEY = getApiKey('elevenlabs');
const HAS_ELEVENLABS = hasApiKey('elevenlabs');

export async function cloneVoice(audioSampleBase64, name = 'Owner Voice') {
  if (!HAS_ELEVENLABS) {
    return { voiceId: null, mock: true, message: 'ELEVENLABS_API_KEY не настроен. Добавьте ключ в Owner Dashboard → API Keys.' };
  }
  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: 'Cloned voice for OMEGA Digital Twin', files: [] })
  });
  if (!response.ok) throw new Error(`Voice clone error: ${response.status}`);
  const data = await response.json();
  return { voiceId: data.voice_id, mock: false };
}

export async function getClonedVoices() {
  if (!HAS_ELEVENLABS) return { voices: [], mock: true };
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': ELEVENLABS_API_KEY } });
  const data = await res.json();
  return { voices: data.voices?.filter(v => v.category === 'cloned') || [], mock: false };
}
