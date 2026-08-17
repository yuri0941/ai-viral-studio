import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation.js'
import { request } from '../../services/api.js'
import { MessageCircle, X, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { CLIENT_BOT_URL } from '../../config/bots.js'

export default function SupportWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setSending(true)
    setError(null)
    try {
      await request('/support', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          description,
          screenshot,
          source: 'website_widget'
        })
      })
      toast.success(t('telegram.supportSent') || 'Обращение отправлено')
      setSubject('')
      setDescription('')
      setScreenshot('')
      setOpen(false)
    } catch (err) {
      // [TG-FREETEXT-HOTFIX+] при CORS/сетевой ошибке показываем честный текст + ссылку на TG-бота
      setError(`Ошибка соединения, напишите в Telegram: ${CLIENT_BOT_URL}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-[100] w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/25 flex items-center justify-center transition-transform hover:scale-110"
        aria-label={t('telegram.support') || 'Поддержка'}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[100] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl p-5 animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-violet-400" /> {t('telegram.support') || 'Поддержка'}
            </h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t('support.subject') || 'Тема'}
              className="w-full px-3 py-2 rounded-xl bg-[#1b1b24] border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('support.description') || 'Опишите проблему...'}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-[#1b1b24] border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none"
            />
            <input
              value={screenshot}
              onChange={e => setScreenshot(e.target.value)}
              placeholder={t('support.screenshotUrl') || 'Ссылка на скриншот (необязательно)'}
              className="w-full px-3 py-2 rounded-xl bg-[#1b1b24] border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs break-words">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {sending ? <span className="animate-pulse">{t('common.sending') || 'Отправка...'}</span> : <><Send className="w-4 h-4" /> {t('common.send') || 'Отправить'}</>}
            </button>
            <a
              href={CLIENT_BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-violet-400 hover:text-violet-300"
            >
              {t('telegram.writeInTelegram') || 'Написать в Telegram'}
            </a>
          </form>
        </div>
      )}
    </>
  )
}
