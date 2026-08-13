import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, Database, Mail, MapPin, Trash2, Cookie, Server, Scale, Phone, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config.js';

export default function PrivacyPage() {
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
    phone: '+79623164478',
    siteUrl: 'app.aiviral.studio'
  };

  const operatorBlock = legal
    ? `${legal.operatorName}${legal.inn ? ` (ИНН: ${legal.inn})` : ''}, email: ${legal.contactEmail || legal.email || '—'}, адрес: ${legal.operatorAddress || '—'}`
    : `Оператор: ${FALLBACK.operatorName} (ИНН: ${FALLBACK.inn}), email: ${FALLBACK.contactEmail}, адрес: ${FALLBACK.operatorAddress}`;

  const contactEmail = legal?.contactEmail || legal?.email || FALLBACK.contactEmail;
  const emailLink = (email) => <a href={`mailto:${email}`} className="text-emerald-400 underline">{email}</a>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
            Политика конфиденциальности
          </h1>
          <p className="text-slate-500">Как мы собираем, используем и защищаем ваши данные</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <Eye size={20} className="text-emerald-400" />
            <span className="text-sm text-slate-400">Дата вступления в силу: 30 июля 2026 г.</span>
          </div>

          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border-l-4 border-emerald-500">
            <p className="text-slate-300 text-sm leading-relaxed m-0 flex items-start gap-2">
              <Scale size={16} className="text-emerald-400 mt-1 shrink-0" />
              <span><strong>Оператор:</strong> {operatorBlock}</span>
            </p>
            <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
              <Server size={16} className="text-emerald-400" /> Сайт: {legal?.siteUrl || 'app.aiviral.studio'}
            </p>
            {legal?.phone && (
              <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
                <Phone size={16} className="text-emerald-400" /> {legal.phone}
              </p>
            )}
          </div>

          <Section icon={<Eye size={18} />} title="1. Кто мы">
            <p>Оператор сервиса: {operatorBlock}. Сайт: {legal?.siteUrl || 'app.aiviral.studio'}.</p>
            <p>Сервис AI Viral Studio (далее — «Сервис») предоставляет инструменты для генерации контента с использованием искусственного интеллекта.</p>
          </Section>

          <Section icon={<Database size={18} />} title="2. Какие данные мы собираем">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Email</strong> — для регистрации, входа, уведомлений.</li>
              <li><strong>Имя / название бизнеса / никнейм</strong> — для персонализации.</li>
              <li><strong>Сообщения в AI-чате</strong> — для генерации ответов.</li>
              <li><strong>Ниша и предпочтения</strong> — для персонализации рекомендаций.</li>
              <li><strong>Сгенерированный контент</strong> — для отображения в планировщике.</li>
              <li><strong>Технические данные:</strong> IP-адрес, User-Agent, cookies (JWT-токен).</li>
            </ul>
          </Section>

          <Section icon={<Server size={18} />} title="3. Как мы используем данные">
            <ul className="list-disc pl-5 space-y-1">
              <li>Для предоставления доступа к функциям Сервиса.</li>
              <li>Для генерации контента через AI-провайдеров.</li>
              <li>Для отправки email-уведомлений.</li>
              <li>Для технической поддержки.</li>
              <li>Для аналитики использования (без персональной идентификации).</li>
            </ul>
          </Section>

          <Section icon={<Mail size={18} />} title="4. Передача данных третьим лицам">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-700/50 rounded-lg overflow-hidden">
                <thead className="bg-slate-800/50 text-slate-300">
                  <tr><th className="p-2">Провайдер</th><th className="p-2">Страна</th><th className="p-2">Цель</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  <tr><td className="p-2">MongoDB Atlas</td><td className="p-2">США</td><td className="p-2">Хранение базы данных</td></tr>
                  <tr><td className="p-2">GitHub Models</td><td className="p-2">США</td><td className="p-2">Обработка AI-запросов</td></tr>
                  <tr><td className="p-2">Cloudflare Workers AI</td><td className="p-2">США / ЕС</td><td className="p-2">Обработка AI-запросов (резерв)</td></tr>
                  <tr><td className="p-2">HuggingFace</td><td className="p-2">США / ЕС</td><td className="p-2">Обработка AI-запросов (резерв)</td></tr>
                  <tr><td className="p-2">ЮKassa</td><td className="p-2">РФ</td><td className="p-2">Обработка платежей</td></tr>
                  <tr><td className="p-2">Nodemailer / Email-провайдер</td><td className="p-2">РФ / ЕС</td><td className="p-2">Отправка email</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={<MapPin size={18} />} title="5. Трансраничная передача">
            <p>Ваши персональные данные могут передаваться и обрабатываться в США и Европейском союзе (сервера MongoDB Atlas, GitHub, Cloudflare, HuggingFace). Мы обеспечиваем защиту данных на уровне, соответствующем требованиям 152-ФЗ РФ, и запрашиваем ваше явное согласие на трансграничную передачу при регистрации.</p>
          </Section>

          <Section icon={<Database size={18} />} title="6. Сроки хранения">
            <p>Данные хранятся до момента удаления вашего аккаунта. Email-уведомления и платёжная история хранятся 3 года в соответствии с налоговым законодательством РФ.</p>
          </Section>

          <Section icon={<Trash2 size={18} />} title="7. Ваши права">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Доступ:</strong> запросить копию ваших данных.</li>
              <li><strong>Исправление:</strong> изменить данные в личном кабинете.</li>
              <li><strong>Удаление:</strong> удалить аккаунт — напишите на {emailLink(contactEmail)}.</li>
              <li><strong>Отзыв согласия:</strong> напишите на {emailLink(contactEmail)}. Данные удалятся в течение 30 дней, доступ к Сервису прекратится.</li>
            </ul>
          </Section>

          <Section icon={<Cookie size={18} />} title="8. Cookies">
            <p>Только технические cookies (JWT-токен, тема, валюта). Сторонних трекеров нет.</p>
          </Section>

          <Section icon={<Shield size={18} />} title="9. Безопасность">
            <p>HTTPS, bcrypt для паролей, JWT-токены. Доступ к базе ограничен.</p>
          </Section>

          <Section icon={<Server size={18} />} title="9.1. Google API Services Limited Use">
            <p><strong>RU:</strong> При подключении YouTube мы получаем доступ к вашему каналу (OAuth). Мы используем данные только для выполнения ваших явных команд: загрузка видео, удаление видео, чтение списка видео. Токены хранятся в зашифрованном виде (AES-256). Мы не передаём данные Google третьим лицам, не продаём их и не используем для рекламы. Отозвать доступ можно в любой момент кнопкой «Отключить YouTube» в настройках.</p>
            <p><strong>EN:</strong> When you connect YouTube, we access your channel via OAuth. We use Google data only to execute your explicit commands: uploading videos, deleting videos, and reading your video list. Tokens are stored encrypted (AES-256). We do not share, sell, or use Google user data for advertising. You can revoke access at any time with the "Disconnect YouTube" button in Settings.</p>
          </Section>

          <Section icon={<MessageCircle size={18} />} title="10. Изменения">
            <p>Обновления Политики — уведомление по email при существенных изменениях.</p>
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
              <Link to="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
              <Link to="/consent" className="hover:text-emerald-400 transition-colors">Consent</Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-800 py-10 mt-10">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <span>© 2026 AI Viral Studio. Все права защищены.</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
              <Link to="/consent" className="hover:text-emerald-400 transition-colors">Consent</Link>
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
        <span className="text-emerald-400">{icon}</span>
        {title}
      </h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2 pl-6 border-l-2 border-slate-700/50">
        {children}
      </div>
    </div>
  );
}
