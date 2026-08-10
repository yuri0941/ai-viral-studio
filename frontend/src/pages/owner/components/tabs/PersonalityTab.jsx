import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Mic, BookOpen, Swords, Sparkles, Loader2, CheckCircle, AlertTriangle, Send, RefreshCw, Volume2 } from 'lucide-react';
import { request } from '../../../../services/api.js';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass-luxury rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
          <Icon size={20} />
        </div>
        <h3 className="font-semibold text-white text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-white mt-1">{value || '-'}</p>
    </div>
  );
}

export default function PersonalityTab({ data }) {
  const { t } = useTranslation();
  const { showToast } = data || {};

  const [activeSection, setActiveSection] = useState('style');
  const [sampleText, setSampleText] = useState('');
  const [profile, setProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [rewriteInput, setRewriteInput] = useState('');
  const [rewritten, setRewritten] = useState('');
  const [rewriting, setRewriting] = useState(false);

  const [challengeInput, setChallengeInput] = useState('');
  const [challengeContext, setChallengeContext] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challenging, setChallenging] = useState(false);

  const [audioFile, setAudioFile] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [clonedVoices, setClonedVoices] = useState([]);

  const [decisions, setDecisions] = useState([]);
  const [newDecision, setNewDecision] = useState({ decision: '', context: '', result: '' });
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  const fetchDecisions = useCallback(async () => {
    setLoadingDecisions(true);
    try {
      const res = await request('/omega-supreme/diary/history?limit=20');
      setDecisions(res?.history || []);
    } catch (err) {
      console.error('[PersonalityTab] fetch decisions failed', err);
    } finally {
      setLoadingDecisions(false);
    }
  }, []);

  const fetchClonedVoices = useCallback(async () => {
    try {
      const res = await request('/omega-supreme/voice/cloned');
      setClonedVoices(res?.voices || []);
    } catch (err) {
      console.error('[PersonalityTab] fetch voices failed', err);
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
    fetchClonedVoices();
  }, [fetchDecisions, fetchClonedVoices]);

  const handleAnalyze = async () => {
    if (!sampleText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await request('/omega-supreme/personality/analyze', {
        method: 'POST',
        body: JSON.stringify({ messages: sampleText.split('\n').filter(Boolean) }),
      });
      setProfile(res?.profile || null);
      showToast?.(t('personality.analyzeSuccess'), 'success');
    } catch (err) {
      showToast?.(err.message || t('personality.analyzeError'), 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteInput.trim()) return;
    setRewriting(true);
    try {
      const res = await request('/omega-supreme/personality/rewrite', {
        method: 'POST',
        body: JSON.stringify({ text: rewriteInput }),
      });
      setRewritten(res?.rewritten || '');
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setRewriting(false);
    }
  };

  const handleChallenge = async () => {
    if (!challengeInput.trim()) return;
    setChallenging(true);
    try {
      const res = await request('/omega-supreme/personality/challenge', {
        method: 'POST',
        body: JSON.stringify({ decision: challengeInput, context: challengeContext }),
      });
      setChallengeResult(res || null);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setChallenging(false);
    }
  };

  const handleClone = async () => {
    if (!audioFile) return;
    setCloning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result || '').toString().split(',')[1];
          const res = await request('/omega-supreme/voice/clone', {
            method: 'POST',
            body: JSON.stringify({ audioSample: base64, name: 'Owner Voice' }),
          });
          if (res?.mock) {
            showToast?.(res.message || 'Voice clone mock', 'info');
          } else {
            showToast?.(t('personality.cloneSuccess'), 'success');
          }
          fetchClonedVoices();
        } catch (err) {
          showToast?.(err.message, 'error');
        } finally {
          setCloning(false);
        }
      };
      reader.readAsDataURL(audioFile);
    } catch (err) {
      showToast?.(err.message, 'error');
      setCloning(false);
    }
  };

  const handleLogDecision = async () => {
    if (!newDecision.decision.trim()) return;
    try {
      await request('/omega-supreme/diary/log', {
        method: 'POST',
        body: JSON.stringify(newDecision),
      });
      setNewDecision({ decision: '', context: '', result: '' });
      fetchDecisions();
      showToast?.(t('personality.diaryLogged'), 'success');
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const updateOutcome = async (id, outcome, lessons) => {
    try {
      await request(`/omega-supreme/diary/${id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ outcome, lessons }),
      });
      fetchDecisions();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
          <Fingerprint size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('personality.title')}</h2>
          <p className="text-white/60 mt-1">OMEGA копирует ваш стиль речи, голос и этические рамки.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'style', label: t('personality.style'), icon: Sparkles },
          { id: 'voice', label: t('personality.voiceClone'), icon: Mic },
          { id: 'diary', label: t('personality.diary'), icon: BookOpen },
          { id: 'challenge', label: t('personality.challenge'), icon: Swords },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
              activeSection === tab.id ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'style' && (
        <div className="space-y-6">
          <Section title={t('personality.analyze')} icon={Sparkles}>
            <textarea
              value={sampleText}
              onChange={e => setSampleText(e.target.value)}
              placeholder={t('personality.samplePlaceholder')}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !sampleText.trim()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {t('personality.analyze')}
            </button>

            {profile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <Badge label={t('personality.tone')} value={profile.tone} />
                <Badge label={t('personality.humor')} value={profile.humor} />
                <Badge label={t('personality.emoji')} value={profile.emojiPattern} />
                <Badge label={t('personality.decisionStyle')} value={profile.decisionStyle} />
                <Badge label={t('personality.greeting')} value={profile.greeting} />
                <Badge label={t('personality.farewell')} value={profile.farewell} />
                <Badge label={t('personality.sentenceLength')} value={profile.sentenceLength} />
                <Badge label={t('personality.phrases')} value={(profile.phrases || []).slice(0, 3).join(', ')} />
              </div>
            )}
          </Section>

          <Section title={t('personality.rewrite')} icon={Send}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <textarea
                value={rewriteInput}
                onChange={e => setRewriteInput(e.target.value)}
                placeholder={t('personality.rewritePlaceholder')}
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none"
              />
              <div className="bg-black/20 rounded-xl p-4 border border-white/10 min-h-[120px]">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{t('personality.result')}</p>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{rewritten || t('personality.rewriteHint')}</p>
              </div>
            </div>
            <button
              onClick={handleRewrite}
              disabled={rewriting || !rewriteInput.trim()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
            >
              {rewriting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {t('personality.rewrite')}
            </button>
          </Section>
        </div>
      )}

      {activeSection === 'voice' && (
        <Section title={t('personality.voiceClone')} icon={Mic}>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-sm text-white/70 mb-3">{t('personality.voiceHint')}</p>
            <input
              type="file"
              accept="audio/*"
              onChange={e => setAudioFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-violet-600 file:text-white hover:file:bg-violet-500 mb-3"
            />
            <button
              onClick={handleClone}
              disabled={cloning || !audioFile}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
            >
              {cloning ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              {t('personality.clone')}
            </button>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">{t('personality.clonedVoices')}</h4>
            {clonedVoices.length === 0 ? (
              <p className="text-sm text-white/50">{t('personality.noClonedVoices')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clonedVoices.map((v, i) => (
                  <div key={v.voice_id || i} className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                    <Volume2 size={16} className="text-violet-400" />
                    <span className="text-sm text-white">{v.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {activeSection === 'diary' && (
        <Section title={t('personality.diary')} icon={BookOpen}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <input
              type="text"
              value={newDecision.decision}
              onChange={e => setNewDecision(p => ({ ...p, decision: e.target.value }))}
              placeholder={t('personality.decision')}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
            <input
              type="text"
              value={newDecision.context}
              onChange={e => setNewDecision(p => ({ ...p, context: e.target.value }))}
              placeholder={t('personality.context')}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
            <input
              type="text"
              value={newDecision.result}
              onChange={e => setNewDecision(p => ({ ...p, result: e.target.value }))}
              placeholder={t('personality.result')}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
          </div>
          <button
            onClick={handleLogDecision}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2"
          >
            <Send size={16} />
            {t('personality.logDecision')}
          </button>

          <div className="space-y-3 pt-2">
            {loadingDecisions ? (
              <Loader2 className="animate-spin text-white/50" />
            ) : decisions.length === 0 ? (
              <p className="text-sm text-white/50">{t('personality.noDecisions')}</p>
            ) : (
              decisions.map((node, i) => {
                const entry = node?.metadata?.entry || {};
                const outcome = entry.outcome || 'pending';
                return (
                  <div key={node._id || i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{entry.decision}</p>
                        <p className="text-xs text-white/50 mt-1">{entry.context}</p>
                        <p className="text-xs text-white/50 mt-1">{t('personality.result')}: {entry.result}</p>
                        <p className="text-xs text-white/30 mt-1">{new Date(entry.timestamp || node.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {outcome === 'success' && <CheckCircle size={18} className="text-emerald-400" />}
                        {outcome === 'failure' && <AlertTriangle size={18} className="text-rose-400" />}
                        {outcome === 'partial' && <RefreshCw size={18} className="text-amber-400" />}
                        {outcome === 'pending' && <span className="w-2 h-2 rounded-full bg-white/30" />}
                        <select
                          value={outcome}
                          onChange={e => updateOutcome(node._id, e.target.value, entry.lessons)}
                          className="text-xs bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-white outline-none"
                        >
                          <option value="pending">{t('personality.pending')}</option>
                          <option value="success">{t('personality.success')}</option>
                          <option value="failure">{t('personality.failure')}</option>
                          <option value="partial">{t('personality.partial')}</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      defaultValue={(entry.lessons || []).join('\n')}
                      onBlur={e => updateOutcome(node._id, outcome, e.target.value.split('\n'))}
                      placeholder={t('personality.lessons')}
                      rows={2}
                      className="w-full mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                );
              })
            )}
          </div>
        </Section>
      )}

      {activeSection === 'challenge' && (
        <Section title={t('personality.challenge')} icon={Swords}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <textarea
                value={challengeInput}
                onChange={e => setChallengeInput(e.target.value)}
                placeholder={t('personality.challengePlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none"
              />
              <textarea
                value={challengeContext}
                onChange={e => setChallengeContext(e.target.value)}
                placeholder={t('personality.challengeContextPlaceholder')}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={handleChallenge}
                disabled={challenging || !challengeInput.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
              >
                {challenging ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
                {t('personality.challenge')}
              </button>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/10 min-h-[160px]">
              {challengeResult ? (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 text-sm font-medium ${challengeResult.shouldChallenge ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {challengeResult.shouldChallenge ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    {challengeResult.shouldChallenge ? t('personality.challengeWarning') : t('personality.challengeOk')}
                  </div>
                  <p className="text-sm text-white/80">{challengeResult.reason}</p>
                  {challengeResult.alternative && (
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">{t('personality.alternative')}</p>
                      <p className="text-sm text-white/90 mt-1">{challengeResult.alternative}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/50">{t('personality.challengeHint')}</p>
              )}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
