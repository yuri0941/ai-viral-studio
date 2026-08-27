import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, FileText, AlertTriangle, CheckCircle, Lock, Scale, Mail, MapPin, User, Phone, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config.js';

export default function TermsPage() {
  const [legal, setLegal] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/legal-info`)
      .then(r => r.json())
      .then(data => { setLegal(data?.legalInfo || null); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2"><span className="animate-pulse">Загрузка...</span></div>
      </div>
    );
  }

  const FALLBACK = {
    operatorName: 'Тихонов Юрий Сергеевич',
    inn: '344212910482',
    operatorType: 'Самозанятый',
    contactEmail: 'tvinki05@yandex.ru',
    email: 'tvinki05@yandex.ru',
    operatorAddress: 'г.Волгоград, Волгоградская обл',
    phone: '+79623164478'
  };

  const operatorText = legal
    ? `${legal.operatorName}${legal.inn ? ` (ИНН: ${legal.inn})` : ''}. Email: ${legal.contactEmail || legal.email || '—'}. Адрес: ${legal.operatorAddress || '—'}.`
    : `Оператор: ${FALLBACK.operatorName} (ИНН: ${FALLBACK.inn}). Email: ${FALLBACK.contactEmail}. Адрес: ${FALLBACK.operatorAddress}.`;

  const contactEmail = legal?.contactEmail || legal?.email || FALLBACK.contactEmail;
  const emailLink = (email) => <a href={`mailto:${email}`} className="text-purple-400 underline">{email}</a>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-500/20">
            <Scale size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
            Условия использования
          </h1>
          <p className="text-slate-500">Юридическая информация и условия использования AI Viral Studio</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <Shield size={20} className="text-purple-400" />
            <span className="text-sm text-slate-400">Дата вступления в силу: 27 августа 2026 г.</span>
          </div>

          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border-l-4 border-purple-500">
            <p className="text-slate-300 text-sm leading-relaxed m-0">
              <User size={16} className="inline mr-2 text-purple-400" />
              <strong>Оператор:</strong> {operatorText}
            </p>
            {legal?.phone && (
              <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
                <Phone size={16} className="text-purple-400" /> {legal.phone}
              </p>
            )}
          </div>

          <Section icon={<FileText size={18} />} title="1. Общие положения">
            <p>1.1. Настоящие Условия (далее — «Оферта») регулируют отношения между Оператором и пользователем Сервиса AI Viral Studio.</p>
            <p>1.2. Акцепт оферты — регистрация в Сервисе и проставление галочки «Я согласен с Условиями использования».</p>
            <p>1.3. Сервис предназначен для лиц старше 18 лет.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="2. Описание услуг">
            <p>2.1. Сервис предоставляет программный доступ к инструментам генерации текстового и медиа-контента с помощью искусственного интеллекта, планировщику публикаций, аналитике.</p>
            <p>2.2. Сервис является инструментом (software-as-a-service). Все результаты генерации носят рекомендательный характер.</p>
            <p>2.3. Мы <strong>не гарантируем</strong>: вирусность контента, конкретные охваты, продажи, рост подписчиков.</p>
            <p>2.4. Мы <strong>не являемся</strong>: СМИ, медицинской организацией, юридической конторой, финансовым консультантом. AI-ответы — не профессиональная консультация.</p>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="3. Запрещённый контент">
            <p>Используя AI-генерацию, вы обязуетесь НЕ создавать и НЕ публиковать контент, связанный с:</p>
            <ul className="list-disc pl-5 space-y-1">
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
          </Section>

          <Section icon={<FileText size={18} />} title="4. Маркировка контента">
            <p>4.1. Контент, созданный с помощью ИИ, может быть промаркирован фразой «Контент создан с помощью ИИ». Пользователь сам решает, оставлять маркировку или нет.</p>
            <p>4.2. Контент, содержащий признаки рекламы, должен быть промаркирован пользователем как #реклама или #ad.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="5. Права интеллектуальной собственности">
            <p>5.1. Весь сгенерированный контент принадлежит пользователю.</p>
            <p>5.2. Пользователь предоставляет нам неисключительную лицензию на обработку его контента исключительно для целей работы Сервиса.</p>
            <p>5.3. Название, логотип, код и дизайн AI Viral Studio — интеллектуальная собственность Оператора.</p>
          </Section>

          <Section icon={<Lock size={18} />} title="6. Платежи и подписки">
            <p>6.1. Все цены указаны в рублях РФ (₽). НДС не облагается в связи с применением спецрежима ({legal?.operatorType || 'самозанятый'}).</p>
            <p>6.2. Подписка продлевается автоматически каждый месяц до момента отмены.</p>
            <p>6.3. Оплата производится через платёжного агента ЮKassa (РФ).</p>
            <p>6.4. При отмене доступ сохраняется до конца оплаченного периода.</p>
          </Section>

          <Section icon={<CheckCircle size={18} />} title="7. Возврат средств">
            <p>7.1. Возврат возможен в течение 14 календарных дней с момента оплаты, если услуга не была оказана (пользователь не сгенерировал ни одного поста/ответа).</p>
            <p>7.2. Если услуга оказана частично или полностью — возврат рассматривается индивидуально по запросу на {emailLink(contactEmail)}.</p>
            <p>7.3. Возврат производится на ту же карту/счёт, с которого была произведена оплата.</p>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="8. Ограничение ответственности">
            <p>8.1. Сервис предоставляется «как есть» (as is). Мы не несём ответственности за прямые или косвенные убытки, включая упущенную выгоду.</p>
            <p>8.2. Мы не несём ответственности за контент, опубликованный пользователем в социальных сетях.</p>
            <p>8.3. Мы не гарантируем бесперебойную работу Сервиса.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="9. Блокировка и удаление аккаунта">
            <p>9.1. Блокировка при нарушении Условий, генерации запрещённого контента, спаме, попытках взлома.</p>
            <p>9.2. Удаление аккаунта — самостоятельно или запросом на {emailLink(contactEmail)}.</p>
          </Section>

          <Section icon={<MessageCircle size={18} />} title="10. Изменения условий">
            <p>Существенные изменения — уведомление по email за 7 дней.</p>
            <p>По вопросам: {emailLink(contactEmail)}</p>
          </Section>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              ← Назад
            </button>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy</Link>
              <Link to="/consent" className="hover:text-purple-400 transition-colors">Consent</Link>
            </div>
          </div>
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
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-purple-400">{icon}</span>
        {title}
      </h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2 pl-6 border-l-2 border-slate-700/50">
        {children}
      </div>
    </div>
  );
}
