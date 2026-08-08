import { useState, useRef } from 'react'
import { MessageCircle, X, Send, Paperclip, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { request } from '../../services/api.js'
import toast from 'react-hot-toast'

export default function SupportWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 300 * 1024) {
      toast.error('Скриншот должен быть меньше 300KB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setScreenshot(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setLoading(true)
    try {
      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        screenshot: screenshot || undefined,
      }
      const isAuth = !!user?._id || !!user?.id
      const endpoint = isAuth ? '/support' : '/support/public'
      const res = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(isAuth ? payload : { ...payload, email: user?.email || 'guest@aiviral-studio.ru', name: user?.name || 'Guest' })
      })
      setResult(res?.data || res)
      setSubject('')
      setDescription('')
      setScreenshot('')
      toast.success('Обращение отправлено')
    } catch (err) {
      console.error('[SupportWidget] submit failed', err)
      toast.error('Не удалось отправить обращение')
    } finally {
      setLoading(false)
    }
  }

  const userId = user?._id || user?.id || 'guest'

  return (
    <>
      <button
        data-tour="support-widget"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Поддержка"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#15151c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-400" /> Поддержка
              </h3>
              <button
                onClick={() => { setIsOpen(false); setResult(null) }}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[80vh] overflow-y-auto">
              {result ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                    ✅ Обращение <b>#{String(result.ticketId || result.data?._id).slice(-6)}</b> создано.
                  </div>
                  {result.aiSuggestion && (
                    <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-sm">
                      <div className="font-semibold mb-1">💡 Совет OMEGA</div>
                      {result.aiSuggestion}
                    </div>
                  )}
                  <a
                    href={`https://t.me/aiviral_omega_bot?start=support_${userId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center px-4 py-2.5 rounded-xl bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 text-sm font-medium transition-colors"
                  >
                    Написать в Telegram
                  </a>
                  <button
                    onClick={() => setResult(null)}
                    className="block w-full text-center px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
                  >
                    Новое обращение
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Тема</label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Например: Ошибка при оплате"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f14] border border-white/10 text-white text-sm placeholder-gray-500 outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Описание проблемы</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Опишите, что произошло..."
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f14] border border-white/10 text-white text-sm placeholder-gray-500 outline-none focus:border-violet-500 resize-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Прикрепить скриншот (max 300KB)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f0f14] border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      {screenshot ? 'Скриншот прикреплён' : 'Прикрепить скриншот'}
                    </button>
                    {screenshot && (
                      <img src={screenshot} alt="preview" className="mt-3 rounded-lg max-h-32 border border-white/10" />
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !subject.trim() || !description.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Отправить
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
