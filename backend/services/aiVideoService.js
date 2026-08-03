import axios from 'axios'
import { chatWithAI } from './aiService.js'

// [P19] added: AI Video generation service for Shorts/Reels

export async function generateVideoScript(topic, niche = 'general', duration = 15) {
  const prompt = `Ты — сценарист вирусных коротких видео (Reels/Shorts/TikTok).
Тема: "${topic}". Ниша: ${niche}. Длительность: ${duration} секунд.
Создай сценарий из 3-5 сцен. Для каждой сцены укажи: текст (озвучка/субтитры), визуальную подсказку, длительность в секундах.
Верни СТРОГО JSON:
{
  "title": "...",
  "hook": "...",
  "cta": "...",
  "scenes": [
    { "index": 1, "text": "...", "visualHint": "...", "duration": 3 }
  ]
}`

  try {
    const ai = await chatWithAI(prompt, [], 'ru')
    const raw = ai?.reply || ''
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw || '{}')
    return {
      title: parsed.title || topic,
      hook: parsed.hook || '',
      cta: parsed.cta || '',
      scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
    }
  } catch (err) {
    console.error('[aiVideoService:generateVideoScript]', err.message)
    // Fallback deterministic script
    const sceneDuration = Math.max(3, Math.floor(duration / 4))
    return {
      title: topic,
      hook: `Всё, что нужно знать о ${topic}`,
      cta: 'Подпишись, чтобы не пропустить!',
      scenes: [
        { index: 1, text: `Хук: ${topic} — то, что вы искали`, visualHint: 'Крупный план + яркий текст', duration: sceneDuration },
        { index: 2, text: 'Раскрытие основной мысли', visualHint: 'Динамичные кадры', duration: sceneDuration },
        { index: 3, text: 'Пример или кейс', visualHint: 'Скриншот/демонстрация', duration: sceneDuration },
        { index: 4, text: 'Призыв к действию', visualHint: 'Лицо + CTA', duration: sceneDuration },
      ],
    }
  }
}

export function generateVideoPlaceholder(script) {
  const scenes = Array.isArray(script?.scenes) ? script.scenes : []
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 3), 0) || 15

  const keyframes = scenes.map((scene, i) => {
    const start = scenes.slice(0, i).reduce((sum, s) => sum + (s.duration || 3), 0)
    const startPct = (start / totalDuration) * 100
    return `
      .scene-${i} {
        animation: sceneFade ${totalDuration}s ease-in-out ${start}s infinite;
        opacity: 0;
      }
      @keyframes sceneFade {
        0%, ${startPct}% { opacity: 0; transform: scale(0.96); }
        ${startPct + 2}% { opacity: 1; transform: scale(1); }
        ${Math.min(100, startPct + (scene.duration || 3) / totalDuration * 100 - 2)}% { opacity: 1; }
        ${Math.min(100, startPct + (scene.duration || 3) / totalDuration * 100)}% { opacity: 0; }
      }
    `
  }).join('\n')

  const sceneDivs = scenes.map((scene, i) => `
    <div class="scene scene-${i}">
      <div class="scene-text">${scene.text || ''}</div>
      <div class="scene-hint">${scene.visualHint || ''}</div>
    </div>
  `).join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f13; color: #fff; font-family: system-ui, sans-serif; overflow: hidden; }
  .video-stage {
    width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1a1a24 0%, #0f0f13 100%); position: relative;
  }
  .scene {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 2rem;
  }
  .scene-text { font-size: clamp(1.5rem, 5vw, 3rem); font-weight: 800; line-height: 1.1; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .scene-hint { margin-top: 1rem; font-size: 0.9rem; color: #a0a0b0; }
  ${keyframes}
</style>
</head>
<body>
  <div class="video-stage">
    ${sceneDivs || '<div class="scene"><div class="scene-text">AI Video Preview</div></div>'}
  </div>
</body>
</html>`

  return {
    html,
    totalDuration,
    scenes,
    fallbackUrl: 'https://www.canva.com/design/?create&utm_source=ai-viral-studio',
  }
}

export async function createVideoPlaceholder(scenes) {
  return generateVideoPlaceholder({ scenes })
}

export async function startReplicateVideo(prompt, duration = 15) {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey) return null

  try {
    const res = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'minimax/video-01',
        input: {
          prompt,
          duration,
          aspect_ratio: '9:16',
        },
      },
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return {
      predictionId: res.data?.id,
      status: res.data?.status,
      urls: res.data?.urls,
    }
  } catch (err) {
    console.error('[aiVideoService:startReplicateVideo]', err.message)
    return null
  }
}

export async function getReplicateStatus(predictionId) {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey || !predictionId) return null
  try {
    const res = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    return {
      status: res.data?.status,
      output: res.data?.output,
      error: res.data?.error,
      urls: res.data?.urls,
    }
  } catch (err) {
    console.error('[aiVideoService:getReplicateStatus]', err.message)
    return null
  }
}

export default { generateVideoScript, generateVideoPlaceholder, createVideoPlaceholder, startReplicateVideo, getReplicateStatus }
