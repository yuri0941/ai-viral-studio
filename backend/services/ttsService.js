import { getApiKey, hasApiKey } from './runtimeConfig.js';

const ELEVENLABS_API_KEY = getApiKey('elevenlabs');
const HAS_ELEVENLABS = hasApiKey('elevenlabs');

export const VOICE_IDS = {
  'ru-RU-female': 'EXAVITQu4vr4xnSDxMaL',
  'ru-RU-male': 'MF3mGyEYCl7XYWbV9V6O',
  'en-US-female': 'EXAVITQu4vr4xnSDxMaL',
  'en-US-male': 'MF3mGyEYCl7XYWbV9V6O'
};

export async function synthesizeSpeech(text, voiceKey = 'ru-RU-female') {
  if (!HAS_ELEVENLABS) {
    return { audioUrl: null, mock: true, message: 'ELEVENLABS_API_KEY не настроен. Добавьте ключ в Owner Dashboard → API Keys.' };
  }
  
  const voiceId = VOICE_IDS[voiceKey] || VOICE_IDS['ru-RU-female'];
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  
  if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { audioUrl: `data:audio/mpeg;base64,${base64}`, mock: false };
}
