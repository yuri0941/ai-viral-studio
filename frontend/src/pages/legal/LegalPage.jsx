import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TermsPage from './TermsPage.jsx'
import PrivacyPage from './PrivacyPage.jsx'
import { API_BASE_URL } from '../../config.js'

const CONSENT_TEXT = `<h1>Согласие на обработку персональных данных</h1>
<p>Я, заполняя форму регистрации на сайте [SITE_URL], даю согласие Оператору ([OPERATOR_NAME], email: [CONTACT_EMAIL]) на обработку моих персональных данных:</p>
<ul>
<li>Email-адрес;</li>
<li>Имя / название бизнеса;</li>
<li>Сообщения и запросы, введённые в AI-чат;</li>
<li>Ниша и предпочтения бизнеса;</li>
<li>Сгенерированный контент;</li>
<li>Технические данные (IP, cookies).</li>
</ul>
<p>Цель обработки: предоставление доступа к функциям Сервиса, генерация контента, отправка уведомлений, техническая поддержка.</p>
<p>Я осознаю и согласен с тем, что мои персональные данные будут передаваться и обрабатываться за пределами Российской Федерации (США, Европейский союз) провайдерами: MongoDB Atlas, Cloudflare, Render, Groq/OpenRouter. Обработка платежей — YooKassa (РФ).</p>
<p>Согласие действует до момента его отзыва путём направления письма на [CONTACT_EMAIL]. В случае отзыва согласия мой аккаунт и данные будут удалены в течение 30 дней.</p>
<p>Подробнее: <a href="/privacy" class="text-purple-400 underline">Политика конфиденциальности</a> и <a href="/terms" class="text-purple-400 underline">Условия использования</a>.</p>`

const CONTENT = {
  consent: { title: 'Согласие на обработку ПДн', html: CONSENT_TEXT },
}

export function LegalPage({ type }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/legal-info`)
        const data = await res.json()
        if (!cancelled) setInfo(data?.legalInfo || {})
      } catch (err) {
        console.error('[LegalPage:load]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const FALLBACK = {
    operatorName: 'Тихонов Юрий Сергеевич',
    inn: '344212910482',
    contactEmail: 'tvinki05@yandex.ru',
    email: 'tvinki05@yandex.ru',
    operatorAddress: 'г.Волгоград, Волгоградская обл',
    siteUrl: 'aiviral-studio.ru'
  }

  const contactEmail = info?.contactEmail || info?.email || FALLBACK.contactEmail
  const contactEmailLink = `<a href="mailto:${contactEmail}" class="text-purple-400 underline">${contactEmail}</a>`

  const content = CONTENT[type] || CONTENT.consent
  const placeholders = {
    '[OPERATOR_NAME]': info?.operatorName || FALLBACK.operatorName,
    '[CONTACT_EMAIL]': contactEmailLink,
    '[OPERATOR_ADDRESS]': info?.operatorAddress || FALLBACK.operatorAddress,
    '[SITE_URL]': info?.siteUrl || FALLBACK.siteUrl,
  }

  let html = content.html
  Object.entries(placeholders).forEach(([key, value]) => {
    html = html.replaceAll(key, value)
  })

  const missingData = !info?.operatorInn

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 opacity-50" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">{content.title}</h1>
          <p className="text-slate-400 max-w-xl mx-auto font-light">Юридическая информация и условия использования AI Viral Studio</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 text-sm text-slate-400 hover:text-purple-400 transition-colors"
        >
          ← Назад
        </button>

        {loading && (
          <div className="p-4 rounded-xl bg-white/5 text-slate-400 animate-pulse">
            Загрузка юридических данных…
          </div>
        )}

        {!loading && missingData && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border-l-4 border-amber-500 text-amber-400">
            ⚠️ Владелец сервиса ещё не заполнил юридические настройки. Некоторые данные отображаются как заглушки.
          </div>
        )}

        <article
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 md:p-10 rounded-2xl shadow-2xl space-y-4 text-slate-400 legal-page-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <footer className="border-t border-slate-800 py-10 mt-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>© 2026 AI Viral Studio. Все права защищены.</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-purple-400 transition-colors">Terms</Link>
            <Link to="/consent" className="hover:text-purple-400 transition-colors">Consent</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function PrivacyPolicyPage() {
  return <PrivacyPage />
}

export function TermsOfServicePage() {
  return <TermsPage />
}

export function ConsentPage() {
  return <LegalPage type="consent" />
}

export default LegalPage
