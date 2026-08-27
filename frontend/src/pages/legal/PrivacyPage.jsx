import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Eye, Database, Mail, MapPin, Trash2, Cookie, Server, Scale, Youtube, MessageCircle } from 'lucide-react';
import { ownerLegalInfoApi } from '../../services/api.js';
import { setLanguage } from '../../i18n';

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const [legalInfo, setLegalInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    ownerLegalInfoApi.public()
      .then(res => { if (mounted) setLegalInfo(res?.legalInfo || null); })
      .catch(() => { if (mounted) setLegalInfo(null); });
    return () => { mounted = false; };
  }, []);

  const lang = (i18n.language || 'ru').slice(0, 2);
  const toggleLang = () => setLanguage(lang === 'ru' ? 'en' : 'ru');

  const operatorText = legalInfo?.operatorName
    ? t('legal.operatorLine', { operator: legalInfo.operatorName, inn: legalInfo.inn || '—' })
    : t('legal.operatorPending');

  const linkify = (text) => {
    const m = String(text).match(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+)/);
    if (!m) return text;
    const target = m[0];
    const href = target.startsWith('http') ? target : `mailto:${target}`;
    return (
      <>
        {text.slice(0, m.index)}
        <a href={href} target={target.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-emerald-400 underline">{target}</a>
        {text.slice(m.index + target.length)}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors"
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2 break-words">
            {t('legal.privacy.title')}
          </h1>
          <p className="text-slate-500">{t('legal.privacy.subtitle')}</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <Eye size={20} className="text-emerald-400" />
            <span className="text-sm text-slate-400">{t('legal.effectiveDate')}</span>
          </div>

          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border-l-4 border-emerald-500">
            <p className="text-slate-300 text-sm leading-relaxed m-0 flex items-start gap-2">
              <Scale size={16} className="text-emerald-400 mt-1 shrink-0" />
              <span><strong>{t('legal.operatorLabel')}</strong> {operatorText}</span>
            </p>
            <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
              <Server size={16} className="text-emerald-400" /> {t('legal.siteLabel')} https://aiviral-studio.ru
            </p>
            {legalInfo?.phone && (
              <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
                <Mail size={16} className="text-emerald-400" /> {legalInfo.phone}
              </p>
            )}
          </div>

          <Section icon={<Eye size={18} />} title={t('legal.privacy.s1t')}>
            <p>{t('legal.privacy.s1p1', { operator: operatorText })}</p>
            <p>{t('legal.privacy.s1p2')}</p>
          </Section>

          <Section icon={<Database size={18} />} title={t('legal.privacy.s2t')}>
            <ul className="list-disc pl-5 space-y-1">
              {[1, 2, 3, 4, 5, 6, 7].map(n => <li key={n}>{t(`legal.privacy.s2i${n}`)}</li>)}
            </ul>
          </Section>

          <Section icon={<Server size={18} />} title={t('legal.privacy.s3t')}>
            <ul className="list-disc pl-5 space-y-1">
              {[1, 2, 3, 4, 5].map(n => <li key={n}>{t(`legal.privacy.s3i${n}`)}</li>)}
            </ul>
          </Section>

          <Section icon={<Mail size={18} />} title={t('legal.privacy.s4t')}>
            <p>{t('legal.privacy.s4intro')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-700/50 rounded-lg overflow-hidden">
                <thead className="bg-slate-800/50 text-slate-300">
                  <tr>
                    <th className="p-2">{t('legal.privacy.s4thProvider')}</th>
                    <th className="p-2">{t('legal.privacy.s4thCountry')}</th>
                    <th className="p-2">{t('legal.privacy.s4thPurpose')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <tr key={n}>
                      <td className="p-2">{t(`legal.privacy.s4r${n}name`)}</td>
                      <td className="p-2">{t(`legal.privacy.s4r${n}country`)}</td>
                      <td className="p-2">{t(`legal.privacy.s4r${n}purpose`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>{t('legal.privacy.s4noSale')}</p>
          </Section>

          <Section icon={<MapPin size={18} />} title={t('legal.privacy.s5t')}>
            <p>{t('legal.privacy.s5p')}</p>
          </Section>

          <Section icon={<Youtube size={18} />} title={t('legal.privacy.s6t')}>
            <p>{t('legal.privacy.s6intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              {[1, 2, 3, 4, 5].map(n => <li key={n}>{linkify(t(`legal.privacy.s6i${n}`))}</li>)}
            </ul>
          </Section>

          <Section icon={<Database size={18} />} title={t('legal.privacy.s7t')}>
            <p>{t('legal.privacy.s7p')}</p>
          </Section>

          <Section icon={<Trash2 size={18} />} title={t('legal.privacy.s8t')}>
            <ul className="list-disc pl-5 space-y-1">
              {[1, 2, 3, 4].map(n => <li key={n}>{linkify(t(`legal.privacy.s8i${n}`))}</li>)}
            </ul>
          </Section>

          <Section icon={<Cookie size={18} />} title={t('legal.privacy.s9t')}>
            <p>{t('legal.privacy.s9p')}</p>
          </Section>

          <Section icon={<Shield size={18} />} title={t('legal.privacy.s10t')}>
            <p>{t('legal.privacy.s10p')}</p>
          </Section>

          <Section icon={<MessageCircle size={18} />} title={t('legal.privacy.s11t')}>
            <p>{t('legal.privacy.s11p1')}</p>
            <p>{linkify(t('legal.privacy.s11p2'))}</p>
          </Section>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              {t('legal.back')}
            </button>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-emerald-400 transition-colors">{t('landing.footer.terms')}</Link>
              <Link to="/consent" className="hover:text-emerald-400 transition-colors">{t('landing.footer.consent')}</Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-800 py-10 mt-10">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <span>{t('landing.footer.copyright')}</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-emerald-400 transition-colors">{t('landing.footer.privacy')}</Link>
              <Link to="/terms" className="hover:text-emerald-400 transition-colors">{t('landing.footer.terms')}</Link>
              <Link to="/consent" className="hover:text-emerald-400 transition-colors">{t('landing.footer.consent')}</Link>
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
