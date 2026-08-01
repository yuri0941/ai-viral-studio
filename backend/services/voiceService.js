import axios from 'axios'
import { OwnerSettings } from '../models/OwnerSettings.js'

export async function synthesizeSpeech(ownerId, text) {
  const settings = await OwnerSettings.findOne({ ownerId }).lean()
  const voiceEnabled = settings?.features?.voice === true
  if (!voiceEnabled) {
    return { status: 'disabled', message: 'Voice interface выключен в настройках' }
  }

  const elevenKey = settings?.voice?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY
  const voiceId = settings?.voice?.elevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

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

export default { synthesizeSpeech }
