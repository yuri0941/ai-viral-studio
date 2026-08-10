import { getProviderKey } from './aiService.js';

export async function generateVoice(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
  const key = process.env.ELEVENLABS_API_KEY || await getProviderKey('elevenlabs');
  if (!key) return { error: 'No ElevenLabs key', fallback: true };
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    const buffer = await res.arrayBuffer();
    return { audio: Buffer.from(buffer).toString('base64'), format: 'mp3' };
  } catch (e) {
    return { error: e.message, fallback: true };
  }
}

export const synthesizeSpeech = generateVoice;

// [v9.9.19-MASTER-AUDIT] Whisper STT: Groq (whisper-large-v3-turbo) → OpenAI (whisper-1), ключи через getProviderKey (hot-reload)
export async function transcribeAudio(buffer, filename = 'voice.ogg', mime = 'audio/ogg') {
  const groqKey = await getProviderKey('groq');
  const openaiKey = await getProviderKey('openai');
  const attempts = [];
  if (groqKey) attempts.push({ url: 'https://api.groq.com/openai/v1/audio/transcriptions', key: groqKey, model: 'whisper-large-v3-turbo', provider: 'groq' });
  if (openaiKey) attempts.push({ url: 'https://api.openai.com/v1/audio/transcriptions', key: openaiKey, model: 'whisper-1', provider: 'openai' });
  if (!attempts.length) return { text: null, needsKey: 'openai' };
  for (const a of attempts) {
    try {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mime }), filename);
      form.append('model', a.model);
      const res = await fetch(a.url, { method: 'POST', headers: { Authorization: `Bearer ${a.key}` }, body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.text) return { text: data.text, provider: a.provider };
      console.warn(`[voice] ${a.provider} STT failed:`, data?.error?.message || res.status);
    } catch (e) {
      console.warn(`[voice] ${a.provider} STT error:`, e.message);
    }
  }
  return { text: null, error: 'transcription_failed' };
}

export async function speechToText(audioBase64) {
  // STT обрабатывается на фронтенде через Web Speech API
  // Этот endpoint — fallback для мобильных/расширений
  return { 
    text: 'Голосовой ввод обрабатывается в браузере. Нажмите 🎤 в чате.', 
    fallback: true,
    source: 'frontend_webspeech'
  };
}
