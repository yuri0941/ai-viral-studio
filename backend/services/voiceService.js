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

export async function speechToText(audioBase64) {
  // STT обрабатывается на фронтенде через Web Speech API
  // Этот endpoint — fallback для мобильных/расширений
  return { 
    text: 'Голосовой ввод обрабатывается в браузере. Нажмите 🎤 в чате.', 
    fallback: true,
    source: 'frontend_webspeech'
  };
}
