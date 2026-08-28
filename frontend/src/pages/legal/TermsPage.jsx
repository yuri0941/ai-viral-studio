import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, FileText, AlertTriangle, CheckCircle, Lock, Scale, User, Mail, Tag, MessageCircle } from 'lucide-react';
import { ownerLegalInfoApi } from '../../services/api.js';
import { setLanguage } from '../../i18n';

export default function TermsPage() {
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

  const contactEmail = legalInfo?.contactEmail || 'tihonovu560@gmail.com';

  // [LINKIFY-DOT] завершающая пунктуация (. , ; : ! ?) не входит в href, но остаётся в тексте
  const linkify = (text) => {
    const m = String(text).match(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+)/);
    if (!m) return text;
    const trailing = m[0].match(/[.,;:!?]+$/)?.[0] || '';
    const target = trailing ? m[0].slice(0, -trailing.length) : m[0];
    if (!target) return text;
    const href = target.startsWith('http') ? target : `mailto:${target}`;
    return (
      <>
        {text.slice(0, m.index)}
        <a href={href} target={target.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-purple-400 underline">{target}</a>
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-500/20">
            <Scale size={32} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2 break-words">
            {t('legal.terms.title')}
          </h1>
          <p className="text-slate-500">{t('legal.terms.subtitle')}</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <Shield size={20} className="text-purple-400" />
            <span className="text-sm text-slate-400">{t('legal.effectiveDate')}</span>
          </div>

          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border-l-4 border-purple-500">
            <p className="text-slate-300 text-sm leading-relaxed m-0">
              <User size={16} className="inline mr-2 text-purple-400" />
              <strong>{t('legal.operatorLabel')}</strong> {operatorText}
            </p>
            {legalInfo?.phone && (
              <p className="text-slate-400 text-sm mt-2 m-0 flex items-center gap-2">
                <Mail size={16} className="text-purple-400" /> {legalInfo.phone}
              </p>
            )}
          </div>

          <Section icon={<FileText size={18} />} title={t('legal.terms.s1t')}>
            <p>{t('legal.terms.s1p1', { operator: operatorText })}</p>
            <p>{t('legal.terms.s1p2')}</p>
            <p>{t('legal.terms.s1p3')}</p>
          </Section>

          <Section icon={<FileText size={18} />} title={t('legal.terms.s2t')}>
            <p>{t('legal.terms.s2p1')}</p>
            <p>{t('legal.terms.s2p2')}</p>
            <p>{t('legal.terms.s2p3')}</p>
            <p>{t('legal.terms.s2p4')}</p>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title={t('legal.terms.s3t')}>
            <p>{t('legal.terms.s3p')}</p>
            <p>{t('legal.terms.s3warn')}</p>
          </Section>

          <Section icon={<Tag size={18} />} title={t('legal.terms.s4t')}>
            <p>{t('legal.terms.s4p1')}</p>
            <p>{t('legal.terms.s4p2')}</p>
          </Section>

          <Section icon={<Scale size={18} />} title={t('legal.terms.s5t')}>
            <p>{t('legal.terms.s5p1')}</p>
            <p>{t('legal.terms.s5p2')}</p>
            <p>{t('legal.terms.s5p3')}</p>
          </Section>

          <Section icon={<Lock size={18} />} title={t('legal.terms.s6t')}>
            <p>{t('legal.terms.s6p1')}</p>
            <p>{t('legal.terms.s6p2')}</p>
            <p>{t('legal.terms.s6p3')}</p>
            <p>{t('legal.terms.s6p4')}</p>
          </Section>

          <Section icon={<CheckCircle size={18} />} title={t('legal.terms.s7t')}>
            <p>{t('legal.terms.s7p1')}</p>
            <p>{linkify(t('legal.terms.s7p2', { email: contactEmail }))}</p>
            <p>{t('legal.terms.s7p3')}</p>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title={t('legal.terms.s8t')}>
            <p>{t('legal.terms.s8p1')}</p>
            <p>{t('legal.terms.s8p2')}</p>
          </Section>

          <Section icon={<MessageCircle size={18} />} title={t('legal.terms.s9t')}>
            <p>{t('legal.terms.s9p1')}</p>
            <p>{linkify(t('legal.terms.s9p2', { email: contactEmail }))}</p>
          </Section>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              {t('legal.back')}
            </button>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-purple-400 transition-colors">{t('landing.footer.privacy')}</Link>
              <Link to="/consent" className="hover:text-purple-400 transition-colors">{t('landing.footer.consent')}</Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-800 py-10 mt-10">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <span>{t('landing.footer.copyright')}</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-purple-400 transition-colors">{t('landing.footer.privacy')}</Link>
              <Link to="/terms" className="hover:text-purple-400 transition-colors">{t('landing.footer.terms')}</Link>
              <Link to="/consent" className="hover:text-purple-400 transition-colors">{t('landing.footer.consent')}</Link>
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
