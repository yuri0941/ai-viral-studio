import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.js'
import { request } from '../../../../services/api.js'
import { Radio, Plus, Loader2, RefreshCw, Play, Pause, BarChart3, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_MIX = { educational: 40, entertaining: 30, promotional: 20, engagement: 10 }

export function ChannelManagerTab() {
  const { t } = useTranslation()
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsId, setStatsId] = useState(null)
  const [form, setForm] = useState({
    channelUsername: '@aiviralstudio',
    niche: 'general',
    times: '09:00,15:00,19:00',
    tone: 'professional',
    autoImage: true,
  })

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const res = await request('/api/channel/config')
      setChannels(res?.data || res || [])
    } catch (err) {
      console.error('[ChannelManagerTab] fetch failed', err)
      toast.error(t('common.error') || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChannels() }, [])

  const createChannel = async (e) => {
    e.preventDefault()
    try {
      const times = form.times.split(',').map(s => s.trim()).filter(Boolean)
      await request('/api/channel/config', {
        method: 'POST',
        body: JSON.stringify({
          channelUsername: form.channelUsername,
          niche: form.niche,
          postingSchedule: { times },
          tone: form.tone,
          autoImage: form.autoImage,
          contentMix: DEFAULT_MIX,
        })
      })
      toast.success(t('common.saved') || 'Сохранено')
      setShowForm(false)
      fetchChannels()
    } catch (err) {
      toast.error(err.message || 'Ошибка создания')
    }
  }

  const toggleActive = async (channel) => {
    try {
      await request(`/api/channel/config/${channel._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !channel.active })
      })
      toast.success(t('common.saved') || 'Сохранено')
      fetchChannels()
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const publishNow = async (channel) => {
    try {
      const res = await request(`/api/channel/publish/${channel._id}`, {
        method: 'POST',
        body: JSON.stringify({ type: 'educational' })
      })
      if (res.success) toast.success(t('channelManager.publishNow') || 'Опубликовано')
      else toast.error(res.error || 'Ошибка публикации')
    } catch (err) {
      toast.error(err.message || 'Ошибка публикации')
    }
  }

  const loadStats = async (channel) => {
    try {
      const res = await request(`/api/channel/stats/${channel._id}`)
      setStats(res)
      setStatsId(channel._id)
    } catch (err) {
      toast.error(err.message || 'Ошибка статистики')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-400" /> {t('channelManager.title') || 'Управление каналами'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">@aiviralstudio — авто-посты, скидки, видео</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('channelManager.addChannel') || 'Добавить канал'}
          </button>
          <button
            onClick={fetchChannels}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createChannel} className="p-5 rounded-2xl border border-white/10 bg-[#0f0f14] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('channelManager.username') || 'Username'}</label>
              <input value={form.channelUsername} onChange={e => setForm({ ...form, channelUsername: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('channelManager.niche') || 'Ниша'}</label>
              <input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('channelManager.schedule') || 'Расписание (HH:MM,HH:MM)'}</label>
              <input value={form.times} onChange={e => setForm({ ...form, times: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('channelManager.tone') || 'Тон'}</label>
              <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500">
                <option value="professional">professional</option>
                <option value="friendly">friendly</option>
                <option value="hype">hype</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.autoImage} onChange={e => setForm({ ...form, autoImage: e.target.checked })} className="accent-violet-500" />
            {t('channelManager.autoImage') || 'Авто-картинки'}
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">{t('common.save') || 'Сохранить'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm">{t('common.cancel') || 'Отмена'}</button>
          </div>
        </form>
      )}

      {loading && !channels.length ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {channels.map(ch => (
            <div key={ch._id} className="p-5 rounded-2xl border border-white/10 bg-[#0f0f14] hover:border-white/15 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ch.active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    <h3 className="text-white font-semibold">{ch.channelUsername}</h3>
                    <span className="text-xs text-gray-500">{ch.niche}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('channelManager.schedule') || 'Расписание'}: {(ch.postingSchedule?.times || []).join(', ') || '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('channelManager.contentMix') || 'Микс'}: E{ch.contentMix?.educational} / Ent{ch.contentMix?.entertaining} / P{ch.contentMix?.promotional} / Eng{ch.contentMix?.engagement}
                  </p>
                  {statsId === ch._id && stats && (
                    <div className="mt-3 text-xs text-gray-300 space-y-1">
                      <p>👥 {stats.subscribers} • 📝 {stats.weekPosts} • 👁 {stats.totalViews?.toLocaleString('ru-RU')}</p>
                      <p className="text-gray-500">{t('channelManager.nextPost') || 'Следующий пост'}: {stats.nextPost ? new Date(stats.nextPost).toLocaleString('ru-RU') : '—'}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => publishNow(ch)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-xs transition-colors">
                    <Megaphone className="w-3.5 h-3.5" /> {t('channelManager.publishNow') || 'Опубликовать'}
                  </button>
                  <button onClick={() => loadStats(ch)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-xs transition-colors">
                    <BarChart3 className="w-3.5 h-3.5" /> {t('channelManager.stats') || 'Статистика'}
                  </button>
                  <button onClick={() => toggleActive(ch)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-xs transition-colors">
                    {ch.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {ch.active ? 'Pause' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!channels.length && (
            <div className="text-center py-16 text-gray-500 bg-white/[0.02] rounded-2xl border border-white/5">
              <Radio className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{t('channelManager.noChannels') || 'Нет настроенных каналов'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
