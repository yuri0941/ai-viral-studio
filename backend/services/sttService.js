import { getApiKey, hasApiKey } from './runtimeConfig.js';

const OPENAI_API_KEY = getApiKey('openai');
const HAS_WHISPER = hasApiKey('openai');

export async function transcribeAudio(audioBuffer, language = 'ru') {
  if (!HAS_WHISPER) {
    return { text: null, mock: true, message: 'OPENAI_API_KEY не настроен. Используйте браузерный Web Speech API или добавьте ключ в Owner Dashboard.' };
  }
  
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });
  
  if (!response.ok) throw new Error(`Whisper error: ${response.status}`);
  const data = await response.json();
  return { text: data.text, mock: false };
}
