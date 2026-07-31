import { google } from 'googleapis'
import { chatWithAI } from './aiService.js'
import axios from 'axios'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const youtube = YOUTUBE_API_KEY ? google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY }) : null

const WHISPER_API_KEY = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY

export async function analyzeChannel(channelId) {
  if (!youtube || !channelId) {
    return {
      success: false,
      error: 'YouTube API key or channelId not configured',
      demo: {
        subscribers: 12500,
        views: 2400000,
        ctr: 8.4,
        topVideos: [
          { title: 'Тренды 2026', views: 340000, likes: 12000 },
          { title: 'Обзор инструментов', views: 210000, likes: 8900 },
        ],
      },
    }
  }

  try {
    const channelRes = await youtube.channels.list({
      part: 'statistics,snippet',
      id: channelId,
    })
    const channel = channelRes.data.items?.[0]
    if (!channel) return { success: false, error: 'Channel not found' }

    const stats = channel.statistics
    const videosRes = await youtube.search.list({
      channelId,
      part: 'snippet',
      order: 'viewCount',
      maxResults: 5,
      type: 'video',
    })

    const topVideos = videosRes.data.items?.map(v => ({
      title: v.snippet.title,
      videoId: v.id.videoId,
      publishedAt: v.snippet.publishedAt,
    })) || []

    return {
      success: true,
      channel: {
        title: channel.snippet.title,
        subscribers: Number(stats.subscriberCount || 0),
        views: Number(stats.viewCount || 0),
        videos: Number(stats.videoCount || 0),
        ctr: (Number(stats.viewCount || 0) / Math.max(Number(stats.subscriberCount || 1), 1) * 100).toFixed(1),
      },
      topVideos,
    }
  } catch (err) {
    console.error('[youtubeAI] analyzeChannel error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function generateShortsScript(topic, niche, duration = 30) {
  const prompt = `Создай сценарий YouTube Shorts длительностью ${duration} секунд на тему "${topic}" для ниши "${niche}". Разбей по таймкодам: хук, основная часть, CTA. Ответ на русском.`
  try {
    const result = await chatWithAI(prompt, [], 'ru')
    return { success: result.success, script: result.reply, provider: result.provider }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function generateAutoSubtitles(videoUrl) {
  if (!WHISPER_API_KEY) {
    return { success: false, error: 'Whisper API key not configured', srt: '' }
  }
  try {
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' })
    const audioBuffer = Buffer.from(response.data)
    const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', audioBuffer, {
      headers: {
        Authorization: `Bearer ${WHISPER_API_KEY}`,
        'Content-Type': 'audio/mp4',
      },
      params: { response_format: 'srt' },
    })
    return { success: true, srt: res.data }
  } catch (err) {
    console.error('[youtubeAI] whisper error:', err.message)
    return { success: false, error: err.message, srt: '' }
  }
}

export async function recommendBestTime(channelId) {
  // Placeholder: in a real implementation, analyze audience activity via YouTube Analytics API
  return {
    success: true,
    recommendation: '18:00 — 20:00 по времени аудитории (пик активности)',
    reasoning: 'Вечернее время показывает максимальное количество просмотров и вовлечённости для большинства ниш.',
  }
}

export default { analyzeChannel, generateShortsScript, generateAutoSubtitles, recommendBestTime }
