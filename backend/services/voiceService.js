import axios from 'axios'
import { OwnerSettings } from '../models/OwnerSettings.js'

export async function synthesizeSpeech(ownerId, text, voiceIdOverride) {
  const settings = await OwnerSettings.findOne({ ownerId }).lean()
  const voiceEnabled = settings?.features?.voice === true
  if (!voiceEnabled) {
    return { status: 'disabled', message: 'Voice interface выключен в настройках' }
  }

  const elevenKey = settings?.voice?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY
  const voiceId = voiceIdOverride || settings?.voice?.elevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

  if (!elevenKey) {
    return {
      status: 'fallback',
      message: 'Для премиум-озвучки добавьте ElevenLabs в API Keys',
      useBrowserTTS: true,
    }
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      { text, model_id: 'eleven_monolingual_v1' },
      {
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    )

    const base64 = Buffer.from(response.data, 'binary').toString('base64')
    return {
      status: 'ok',
      audioBase64: base64,
      contentType: 'audio/mpeg',
    }
  } catch (err) {
    console.error('[voiceService] ElevenLabs failed:', err.message)
    return {
      status: 'fallback',
      message: 'ElevenLabs недоступен, используется браузерная озвучка',
      useBrowserTTS: true,
      error: err.message,
    }
  }
}

// [P19] added: speech-to-text via OpenAI Whisper or Groq Whisper
export async function speechToText(audioBuffer, mimeType = 'audio/webm') {
  const openaiKey = process.env.OPENAI_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!openaiKey && !groqKey) {
    return {
      status: 'fallback',
      transcript: '',
      message: 'Нет API ключа для Whisper. Используйте браузерный Web Speech API.',
    }
  }

  const blob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, 'recording.webm')
  formData.append('model', openaiKey ? 'whisper-1' : 'whisper-large-v3')

  const url = openaiKey
    ? 'https://api.openai.com/v1/audio/transcriptions'
    : 'https://api.groq.com/openai/v1/audio/transcriptions'
  const headers = { Authorization: `Bearer ${openaiKey || groqKey}` }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'STT request failed')
    return { status: 'ok', transcript: data.text || '' }
  } catch (err) {
    console.error('[voiceService:speechToText]', err.message)
    return { status: 'fallback', transcript: '', message: err.message }
  }
}

export default { synthesizeSpeech, speechToText }
