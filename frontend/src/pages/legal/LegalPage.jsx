import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ownerLegalInfoApi } from '../../services/api.js'

const PRIVACY_TEXT = `<h1>Политика конфиденциальности AI Viral Studio</h1>
<p><strong>Дата вступления в силу:</strong> 30 июля 2026 г.</p>
<h2>1. Кто мы</h2>
<p>Оператор сервиса: [OPERATOR_NAME] (далее — «Оператор», «мы»). Контактный email: [CONTACT_EMAIL]. Адрес: [OPERATOR_ADDRESS]. Сайт: [SITE_URL].</p>
<p>Сервис AI Viral Studio (далее — «Сервис») предоставляет инструменты для генерации контента с использованием искусственного интеллекта.</p>
<h2>2. Какие данные мы собираем</h2>
<ul>
<li><strong>Email</strong> — для регистрации, входа, уведомлений.</li>
<li><strong>Имя / название бизнеса / никнейм</strong> — для персонализации.</li>
<li><strong>Сообщения в AI-чате</strong> — для генерации ответов.</li>
<li><strong>Ниша и предпочтения</strong> — для персонализации рекомендаций.</li>
<li><strong>Сгенерированный контент</strong> — для отображения в планировщике.</li>
<li><strong>Технические данные:</strong> IP-адрес, User-Agent, cookies (JWT-токен).</li>
</ul>
<h2>3. Как мы используем данные</h2>
<ul>
<li>Для предоставления доступа к функциям Сервиса.</li>
<li>Для генерации контента через AI-провайдеров.</li>
<li>Для отправки email-уведомлений.</li>
<li>Для технической поддержки.</li>
<li>Для аналитики использования (без персональной идентификации).</li>
</ul>
<h2>4. Передача данных третьим лицам</h2>
<table>
<tr><th>Провайдер</th><th>Страна</th><th>Цель</th></tr>
<tr><td>MongoDB Atlas</td><td>США</td><td>Хранение базы данных</td></tr>
<tr><td>GitHub Models</td><td>США</td><td>Обработка AI-запросов</td></tr>
<tr><td>Cloudflare Workers AI</td><td>США / ЕС</td><td>Обработка AI-запросов (резерв)</td></tr>
<tr><td>HuggingFace</td><td>США / ЕС</td><td>Обработка AI-запросов (резерв)</td></tr>
<tr><td>ЮKassa</td><td>РФ</td><td>Обработка платежей</td></tr>
<tr><td>Nodemailer / Email-провайдер</td><td>РФ / ЕС</td><td>Отправка email</td></tr>
</table>
<h2>5. Трансграничная передача</h2>
<p>Ваши персональные данные могут передаваться и обрабатываться в США и Европейском союзе (сервера MongoDB Atlas, GitHub, Cloudflare, HuggingFace). Мы обеспечиваем защиту данных на уровне, соответствующем требованиям 152-ФЗ РФ, и запрашиваем ваше явное согласие на трансграничную передачу при регистрации.</p>
<h2>6. Сроки хранения</h2>
<p>Данные хранятся до момента удаления вашего аккаунта. Email-уведомления и платёжная история хранятся 3 года в соответствии с налоговым законодательством РФ.</p>
<h2>7. Ваши права</h2>
<ul>
<li><strong>Доступ:</strong> запросить копию ваших данных.</li>
<li><strong>Исправление:</strong> изменить данные в личном кабинете.</li>
<li><strong>Удаление:</strong> удалить аккаунт — напишите на [CONTACT_EMAIL].</li>
<li><strong>Отзыв согласия:</strong> напишите на [CONTACT_EMAIL]. Данные удалятся в течение 30 дней, доступ к Сервису прекратится.</li>
</ul>
<h2>8. Cookies</h2>
<p>Только технические cookies (JWT-токен, тема, валюта). Сторонних трекеров нет.</p>
<h2>9. Безопасность</h2>
<p>HTTPS, bcrypt для паролей, JWT-токены. Доступ к базе ограничен.</p>
<h2>10. Изменения</h2>
<p>Обновления Политики — уведомление по email при существенных изменениях.</p>
<p>По вопросам: [CONTACT_EMAIL]</p>`

const TERMS_TEXT = `<h1>Условия использования AI Viral Studio</h1>
<p><strong>Дата вступления в силу:</strong> 30 июля 2026 г.</p>
<p><strong>Оператор:</strong> [OPERATOR_NAME]. Email: [CONTACT_EMAIL]. Адрес: [OPERATOR_ADDRESS].</p>
<h2>1. Общие положения</h2>
<p>1.1. Настоящие Условия (далее — «Оферта») регулируют отношения между Оператором и пользователем Сервиса AI Viral Studio.</p>
<p>1.2. Акцепт оферты — регистрация в Сервисе и проставление галочки «Я согласен с Условиями использования».</p>
<p>1.3. Сервис предназначен для лиц старше 18 лет.</p>
<h2>2. Описание услуг</h2>
<p>2.1. Сервис предоставляет программный доступ к инструментам генерации текстового и медиа-контента с помощью искусственного интеллекта, планировщику публикаций, аналитике.</p>
<p>2.2. Сервис является инструментом (software-as-a-service). Все результаты генерации носят рекомендательный характер.</p>
<p>2.3. Мы <strong>не гарантируем</strong>: вирусность контента, конкретные охваты, продажи, рост подписчиков.</p>
<p>2.4. Мы <strong>не являемся</strong>: СМИ, медицинской организацией, юридической конторой, финансовым консультантом. AI-ответы — не профессиональная консультация.</p>
<h2>3. Запрещённый контент и поведение</h2>
<p>Используя AI-генерацию, вы обязуетесь НЕ создавать и НЕ публиковать контент, связанный с:</p>
<ul>
<li>Политической агитацией, призывами к голосованию, пропагандой политических партий.</li>
<li>Порнографией, эротикой, сексуальным контентом.</li>
<li>Наркотиками, психотропами, пропагандой употребления.</li>
<li>Оружием, взрывчаткой, инструкциями по изготовлению опасных предметов.</li>
<li>Медицинскими диагнозами, лечением, рекомендациями по приёму лекарств/БАДов.</li>
<li>Финансовыми пирамидами, мошенничеством, фишингом.</li>
<li>Экстремизмом, призывами к насилию, терроризму, религиозной ненависти.</li>
<li>Клеветой, разглашением персональных данных третьих лиц без согласия.</li>
<li>Генерацией фейковых новостей, дезинформации.</li>
</ul>
<p>При нарушении — блокировка аккаунта без возврата средств.</p>
<h2>4. Маркировка контента</h2>
<p>4.1. Контент, созданный с помощью ИИ, может быть промаркирован фразой «Контент создан с помощью ИИ». Пользователь сам решает, оставлять маркировку или нет.</p>
<p>4.2. Контент, содержащий признаки рекламы, должен быть промаркирован пользователем как #реклама или #ad. Сервис показывает предупреждение, но не несёт ответственности за маркировку.</p>
<h2>5. Права интеллектуальной собственности</h2>
<p>5.1. Весь сгенерированный контент принадлежит пользователю.</p>
<p>5.2. Пользователь предоставляет нам неисключительную лицензию на обработку его контента исключительно для целей работы Сервиса.</p>
<p>5.3. Название, логотип, код и дизайн AI Viral Studio — интеллектуальная собственность Оператора.</p>
<h2>6. Платежи и подписки</h2>
<p>6.1. Все цены указаны в рублях РФ (₽). НДС не облагается в связи с применением спецрежима (самозанятый / УСН).</p>
<p>6.2. Подписка продлевается автоматически каждый месяц до момента отмены.</p>
<p>6.3. Оплата производится через платёжного агента ЮKassa (РФ).</p>
<p>6.4. При отмене доступ сохраняется до конца оплаченного периода.</p>
<h2>7. Возврат средств</h2>
<p>7.1. Возврат возможен в течение 14 календарных дней с момента оплаты, если услуга не была оказана (пользователь не сгенерировал ни одного поста/ответа).</p>
<p>7.2. Если услуга оказана частично или полностью — возврат рассматривается индивидуально по запросу на [CONTACT_EMAIL].</p>
<p>7.3. Возврат производится на ту же карту/счёт, с которого была произведена оплата.</p>
<h2>8. Ограничение ответственности</h2>
<p>8.1. Сервис предоставляется «как есть» (as is). Мы не несём ответственности за прямые или косвенные убытки, включая упущенную выгоду.</p>
<p>8.2. Мы не несём ответственности за контент, опубликованный пользователем в социальных сетях.</p>
<p>8.3. Мы не гарантируем бесперебойную работу Сервиса.</p>
<h2>9. Блокировка и удаление аккаунта</h2>
<p>9.1. Блокировка при нарушении Условий, генерации запрещённого контента, спаме, попытках взлома.</p>
<p>9.2. Удаление аккаунта — самостоятельно или запросом на [CONTACT_EMAIL].</p>
<h2>10. Изменения условий</h2>
<p>Существенные изменения — уведомление по email за 7 дней.</p>
<p>По вопросам: [CONTACT_EMAIL]</p>`

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
<p>Я осознаю и согласен с тем, что мои персональные данные будут передаваться и обрабатываться за пределами Российской Федерации (США, Европейский союз) провайдерами: MongoDB Atlas, GitHub Models, Cloudflare, HuggingFace.</p>
<p>Согласие действует до момента его отзыва путём направления письма на [CONTACT_EMAIL]. В случае отзыва согласия мой аккаунт и данные будут удалены в течение 30 дней.</p>`

const CONTENT = {
  privacy: { title: 'Политика конфиденциальности', html: PRIVACY_TEXT },
  terms: { title: 'Условия использования', html: TERMS_TEXT },
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
        const res = await ownerLegalInfoApi.public()
        if (!cancelled) setInfo(res.legalInfo || {})
      } catch (err) {
        console.error('[LegalPage:load]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const content = CONTENT[type] || CONTENT.terms
  const placeholders = {
    '[OPERATOR_NAME]': info?.operatorName || '[Укажите в Юридических настройках владельца]',
    '[CONTACT_EMAIL]': info?.contactEmail || '[Укажите email в настройках]',
    '[OPERATOR_ADDRESS]': info?.operatorAddress || '[Укажите адрес в настройках]',
    '[SITE_URL]': info?.siteUrl || 'app.aiviral.studio',
  }

  let html = content.html
  Object.entries(placeholders).forEach(([key, value]) => {
    html = html.replaceAll(key, value)
  })

  const missingData = !info?.operatorName || !info?.contactEmail || !info?.operatorAddress

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[var(--border)]"> // [P16-CONTINUE] added
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--surface),_var(--bg))] opacity-50" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--text)] mb-3">{content.title}</h1> // [P16-CONTINUE] added
          <p className="text-[var(--text-muted)] max-w-xl mx-auto font-light">Юридическая информация и условия использования AI Viral Studio</p> // [P16-CONTINUE] added
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" // [P16-CONTINUE] added
        >
          ← Назад
        </button>

        {loading && (
          <div className="p-4 rounded-xl glass text-[var(--text-muted)] shimmer"> // [P16-CONTINUE] added
            Загрузка юридических данных…
          </div>
        )}

        {!loading && missingData && (
          <div className="mb-6 p-4 rounded-xl glass border-l-[3px] border-[var(--warning)] bg-[var(--warning)]/5 text-[var(--warning)]"> // [P16-CONTINUE] added
            ⚠️ Владелец сервиса ещё не заполнил юридические настройки. Некоторые данные отображаются как заглушки.
          </div>
        )}

        <article
          className="legal-page-content glass-card p-6 md:p-10 rounded-[var(--radius-xl)] space-y-4 text-[var(--text-muted)]" // [P16-CONTINUE] added
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-strong)] py-10 mt-10"> // [P16-CONTINUE] added
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <span>© 2026 AI Viral Studio. Все права защищены.</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link> // [P16-CONTINUE] added
            <Link to="/terms" className="hover:text-[var(--primary)] transition-colors">Terms</Link> // [P16-CONTINUE] added
            <Link to="/consent" className="hover:text-[var(--primary)] transition-colors">Consent</Link> // [P16-CONTINUE] added
          </div>
        </div>
      </footer>
    </div>
  )
}

export function PrivacyPolicyPage() {
  return <LegalPage type="privacy" />
}

export function TermsOfServicePage() {
  return <LegalPage type="terms" />
}

export function ConsentPage() {
  return <LegalPage type="consent" />
}

export default LegalPage
