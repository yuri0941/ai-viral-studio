import { google } from 'googleapis'
import { chatWithAI, extractText, getProviderKey } from './aiService.js'
import axios from 'axios'

// [v9.9.19-MASTER-AUDIT] hot-reload: клиент YouTube создаётся в момент вызова
async function getYouTubeClient() {
  const key = await getProviderKey('youtube')
  return key ? google.youtube({ version: 'v3', auth: key }) : null
}

export async function analyzeChannel(channelId) {
  const youtube = await getYouTubeClient()
  if (!youtube || !channelId) {
    // [YT-DATA-REAL-STATS] честный отказ вместо демо-цифр (12500 подписчиков и т.п. — удалены)
    return {
      success: false,
      error: 'YouTube Data API ключ не подключён — статистика канала недоступна. Добавьте ключ в Кабинет → API Ключи → YouTube Data API.',
      needsKey: 'youtube',
    }
  }

  try {
    // [YT-DATA-REAL-STATS] через youtubeDataService: кэш канала 6 ч, поиск 6 ч (search.list = 100 ед квоты)
    const { fetchChannelStats, searchYoutubeVideos } = await import('./youtubeDataService.js')
    const ch = await fetchChannelStats(channelId)
    if (!ch.available) return { success: false, error: ch.error?.message || 'Channel not found', code: ch.error?.code }

    const searchRes = await searchYoutubeVideos('', { maxResults: 5 }).catch(() => null)
    // поиск по каналу через search.list недоступен в youtubeDataService без query — берём топ через search по названию канала
    let topVideos = []
    const byChannel = await import('./youtubeDataService.js').then(m => m.searchYoutubeVideos(ch.title, { maxResults: 5 })).catch(() => null)
    const searchData = byChannel?.available ? byChannel : (searchRes?.available ? searchRes : null)
    if (searchData) {
      topVideos = searchData.videos.map(v => ({
        title: v.title,
        videoId: v.videoId,
        publishedAt: v.publishedAt,
      }))
    }

    const stats = { subscriberCount: ch.subscribers, viewCount: ch.totalViews, videoCount: ch.videoCount }
    return {
      success: true,
      channel: {
        title: ch.title,
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
    return { success: result.success, script: extractText(result), provider: result.provider }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function generateAutoSubtitles(videoUrl) {
  const WHISPER_API_KEY = await getProviderKey('openai') || process.env.WHISPER_API_KEY
  if (!WHISPER_API_KEY) {
    return { success: false, error: 'Whisper API key not configured', needsKey: 'openai', srt: '' }
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

export async function generateTitles(topic, niche, count = 5) {
  const prompt = `Сгенерируй ${count} цепляющих заголовков YouTube-видео на тему "${topic}" для ниши "${niche}". Верни только нумерованный список без лишнего текста.`
  try {
    const result = await chatWithAI(prompt, [], 'ru')
    return { success: result.success, titles: extractText(result), provider: result.provider }
  } catch (err) {
    return { success: false, error: err.message }
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

export default { analyzeChannel, generateShortsScript, generateAutoSubtitles, generateTitles, recommendBestTime }
