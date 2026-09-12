import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Mic, Send, Copy, Check, ChevronDown, ChevronUp, Brain, Volume2, VolumeX, Settings, AlertTriangle, Paperclip, MessageCircle, Send as TelegramIcon, Eye, X, FileUp, Film, RotateCcw, Clapperboard, CalendarPlus } from "lucide-react";
import { LuxuryMessageCard } from "./LuxuryMessageCard.jsx";
import { MarkdownText } from "./MarkdownText.jsx";
import { YouTubeAnalysisCard } from "./YouTubeAnalysisCard.jsx";
import OmegaLocalModeIndicator from "./OmegaLocalModeIndicator.jsx";
import OnboardingTour from "../onboarding/OnboardingTour.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { omegaApi, voiceApi, request, planConfigApi } from "../../services/api.js";
import { API_BASE_URL } from "../../config.js";
import { API_URL } from "../../config.js";
import UpsellModal from "../UpsellModal.jsx";
import { playSound } from "../../hooks/useSound.js";
import { useTTS } from "../../hooks/useTTS.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import { CLIENT_BOT_URL } from "../../config/bots.js";

// [DESIGN-LAB-APPLY] «Фокус-чат»: пилюля квоты кликабельна → детализация баланса + «Пополнить».
// Только реальные цифры (trialTokens из /users/me/quota), нарисованных цен нет: 1 сообщение = 1 генерация.
export function QuotaDetailsModal({ quota, user, onClose }) {
  const ref = useModalA11y(onClose)
  const { t } = useTranslation()
  const navigate = useNavigate()
  // [CHAT-PRO-FIX З2] владелец = безлимит (флаг unlimited из /users/me/quota): ∞, без CTA пополнения
  const unlimited = !!quota?.unlimited || user?.role === 'owner'
  const left = quota?.trialTokens ?? user?.trialTokens ?? 0
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('quota.title')}
        className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t('quota.title')}</h3>
          <button onClick={onClose} aria-label={t('common.close', 'Закрыть')} className="text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
        </div>
        <div className="text-3xl font-bold mb-1">{unlimited ? '∞' : `${left}✦`} <span className="text-sm font-normal text-gray-400">{unlimited ? t('chatPro.unlimited') : t('quota.left')}</span></div>
        {!unlimited && <p className="text-sm text-gray-400 mb-1">{t('quota.trialLine', { left })}</p>}
        <p className="text-xs text-gray-500 mb-5">{t('quota.perMessage')}</p>
        {!unlimited && (
        <button
          onClick={() => { onClose(); navigate('/credits') }}
          className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {t('quota.topUp')}
        </button>
        )}
      </div>
    </div>
  )
}

const ACTION_BUTTONS = [
  { id: 'hook', label: 'chat.action.hook', icon: '🪝', prompt: 'Сгенерируй 5 цепляющих хуков для вирусного контента' },
  { id: 'script', label: 'chat.action.script', icon: '📝', prompt: 'Напиши сценарий Reels/Shorts для AI Viral Studio' },
  // [CHAT-UNIFY] «Сгенерировать код» и «Создать сайт» — функции владельца, клиенту не показываем
  { id: 'code', label: 'chat.action.code', icon: '💻', roles: ['owner', 'admin'], prompt: 'Сгенерируй production-ready React/Node.js код для AI Viral Studio. Стек: React 18, Vite, Tailwind, Node.js, Express, MongoDB. Не используй mock.' },
  { id: 'site', label: 'chat.action.site', icon: '🌐', roles: ['owner', 'admin'], prompt: 'Создай landing page для AI Viral Studio: HTML, CSS, структура, тексты, CTA. Верни полный HTML файл.' },
  { id: 'ad-variants', label: 'chat.action.adVariants', icon: '📢', prompt: 'Сгенируй {n} варианта рекламного креатива для AI Viral Studio: заголовок, текст, CTA, целевая аудитория, прогноз CTR и engagement. Верни результат в виде markdown-таблицы.' },
  { id: 'niche', label: 'chat.action.niche', icon: '🔍', prompt: 'Проанализируй нишу AI-инструментов для вирусного контента: тренды, конкуренты, аудитория, возможности.' },
  { id: 'support', label: 'chat.action.support', icon: '💬', action: 'support' }
];

// Защита от дублирующихся кнопок (по id)
const UNIQUE_ACTION_BUTTONS = Array.from(new Map(ACTION_BUTTONS.map(a => [a.id, a])).values());

// [CHAT-UNIFY] ролевой фильтр быстрых действий: code/site — только owner/admin
export function actionButtonsForRole(role) {
  return UNIQUE_ACTION_BUTTONS.filter(a => !a.roles || a.roles.includes(role));
}

// [CHAT-UNIFY ДОП-2б] чипы приветственного экрана пустого чата; code/site — только owner/admin
const WELCOME_CHIPS = [
  { id: 'analyze', label: 'chat.welcome.chipAnalyze', icon: '🔍', prompt: 'Проанализируй видео: ' },
  { id: 'hook', label: 'chat.welcome.chipHook', icon: '🪝', prompt: 'Придумай вирусный хук для моего контента' },
  { id: 'cover', label: 'chat.welcome.chipCover', icon: '🎨', prompt: 'Сделай обложку для поста' },
  { id: 'bestTime', label: 'chat.welcome.chipBestTime', icon: '⏰', prompt: 'Когда лучше постить на YouTube?' },
  { id: 'code', label: 'chat.action.code', icon: '💻', roles: ['owner', 'admin'], prompt: ACTION_BUTTONS.find(a => a.id === 'code').prompt },
  { id: 'site', label: 'chat.action.site', icon: '🌐', roles: ['owner', 'admin'], prompt: ACTION_BUTTONS.find(a => a.id === 'site').prompt },
];

export function welcomeChipsForRole(role) {
  return WELCOME_CHIPS.filter(c => !c.roles || c.roles.includes(role));
}

function getSectionMeta(title) {
  const lower = (title || '').toLowerCase();
  if (lower.includes('хук')) return { icon: '🪝', color: 'violet' };
  if (lower.includes('удерж') || lower.includes('retention')) return { icon: '📊', color: 'cyan' };
  if (lower.includes('cta') || lower.includes('призыв')) return { icon: '🎯', color: 'amber' };
  if (lower.includes('аудитор') || lower.includes('целевая') || lower.includes('ца')) return { icon: '👥', color: 'emerald' };
  if (lower.includes('вирус') || lower.includes('тренд')) return { icon: '🔥', color: 'rose' };
  if (lower.includes('ошибк') || lower.includes('исправ')) return { icon: '⚠️', color: 'orange' };
  return { icon: 'ℹ️', color: 'gray' };
}

function CodeBlock({ code, t }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CodeBlock] copy failed:', err);
    }
  };
  return (
    <div className="relative my-2 group">
      <pre className="bg-black/50 rounded-xl p-3 overflow-x-auto text-xs font-mono text-gray-100 border border-white/10">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? t('chat.copied') : t('chat.copyCode')}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function AiMessageContent({ text, t }) {
  if (!text || typeof text !== 'string') return null;

  // Full HTML preview
  const htmlMatch = text.match(/<html[\s\S]*?<\/html>|<!DOCTYPE[\s\S]*?<\/html>/i);
  if (htmlMatch) {
    return (
      <div className="w-full max-w-[95%] mx-auto space-y-2">
        <iframe
          title="site-preview"
          srcDoc={htmlMatch[0]}
          sandbox="allow-scripts"
          className="w-full h-64 rounded-xl border border-white/10 bg-white"
        />
        <div className="text-sm text-gray-100 leading-relaxed"><MarkdownText text={text.replace(htmlMatch[0], '')} /></div>
      </div>
    );
  }

  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
      <div className="w-full max-w-[95%] mx-auto">
        {parts.map((part, i) => {
          if (part.startsWith('```')) {
            const code = part.replace(/^```(\w+)?\n?/, '').replace(/```$/, '').trim();
            return <CodeBlock key={i} code={code} t={t} />;
          }
          if (part.includes('###')) {
            const sections = part.split(/###\s*/).filter(Boolean);
            return (
              <div key={i} className="w-full">
                {sections.map((section, idx) => {
                  const lines = section.split('\n').filter(Boolean);
                  const title = lines[0] || t('chat.section');
                  const body = lines.slice(1).join('\n') || section;
                  const meta = getSectionMeta(title);
                  return (
                    <LuxuryMessageCard key={idx} title={title} icon={meta.icon} color={meta.color}>
                      <MarkdownText text={body} />
                    </LuxuryMessageCard>
                  );
                })}
              </div>
            );
          }
          return part ? (
            <div key={i} className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
              <MarkdownText text={part} className="text-gray-100" />
            </div>
          ) : null;
        })}
      </div>
    );
  }

  if (text.includes('###')) {
    const sections = text.split(/###\s*/).filter(Boolean);
    return (
      <div className="w-full max-w-[95%] mx-auto">
        {sections.map((section, idx) => {
          const lines = section.split('\n').filter(Boolean);
          const title = lines[0] || t('chat.section');
          const body = lines.slice(1).join('\n') || section;
          const meta = getSectionMeta(title);
          return (
            <LuxuryMessageCard key={idx} title={title} icon={meta.icon} color={meta.color}>
              <MarkdownText text={body} />
            </LuxuryMessageCard>
          );
        })}
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-start max-w-[95%] mx-auto">
      <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
        <MarkdownText text={text} className="text-gray-100" />
      </div>
    </div>
  );
}

export function ReasoningSteps({ reasoning, t }) {
  const [expanded, setExpanded] = useState(false);
  if (!reasoning || !Array.isArray(reasoning) || reasoning.length === 0) return null;
  const steps = reasoning.slice(0, 4);
  const icons = ['🔍', '📊', '🎯', '✨'];
  return (
    <div className="w-full max-w-[95%] mx-auto mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-violet-300 hover:text-violet-200 transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        {t('chat.reasoningTitle')}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-gray-300 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <span className="shrink-0">{icons[i] || '•'}</span>
              <span>
                <span className="text-violet-300 font-medium">{t('chat.step', { number: i + 1 })}:</span>{' '}
                {typeof step === 'string' ? step : step.text || JSON.stringify(step)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function isUserMessage(msg) {
  return msg.role === 'user' || msg.sender === 'user';
}

function isAiMessage(msg) {
  return msg.role === 'omega' || msg.role === 'ai' || msg.sender === 'ai' || msg.sender === 'omega';
}

export default function OmegaChat({
  variant = 'compact',
  messages: externalMessages = [],
  onSend,
  sendMessage,
  isLoading,
  isTyping: externalTyping,
  input: externalInput,
  setInput: externalSetInput,
  quotaError: externalQuotaError,
  userRole: externalUserRole,
  // [OMEGA-VIDEO ДОП-З1] внешний режим: добавка сообщений разбора видео в общую ленту (useOmegaChat)
  injectMessages,
  embedded = false,
  // [CHAT-PRO З3] поиск по ленте: непустая строка фильтрует сообщения (presentational, история не трогается)
  searchQuery = '',
  // [CHAT-PRO-FIX З1] плейсхолдер композера зависит от режима хаба (chat/analyzer/viral)
  inputPlaceholder,
}) {
  const { user } = useAuth();
  // [OWNER-OMEGA] owner/admin/staff не получают CTA продаж — 402/квоты без UpsellModal
  const isPrivileged = ['owner', 'admin', 'staff'].includes(user?.role);
  const { t } = useTranslation();
  const [internalInput, setInternalInput] = useState("");
  const [internalMessages, setInternalMessages] = useState([]);
  const [internalIsTyping, setInternalIsTyping] = useState(false);
  const [internalQuotaError, setInternalQuotaError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState(null);
  // [OMEGA-VIDEO ДОП-З1] видео-вложение: загрузка XHR с прогрессом/отменой → сразу разбор Омегой
  const [videoUpload, setVideoUpload] = useState(null);
  const [mediaLimitMb, setMediaLimitMb] = useState(null);
  const videoXhrRef = useRef(null);
  const videoFramesRef = useRef([]);
  const videoMetaRef = useRef({});
  const [variantCount, setVariantCount] = useState(3);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState(() => localStorage.getItem('omega_recognition_lang') || 'ru');
  const [elevenlabsStatus, setElevenlabsStatus] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [supportMode, setSupportMode] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', screenshot: null });
  const [feedbackId, setFeedbackId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  // [CLIENT-JOURNEY-QA] UpsellModal с живой ценой из PlanConfig при 402 (квота исчерпана)
  const [upsell, setUpsell] = useState(null);
  const openUpsell = (d = {}, reasonText = null) => {
    // [OWNER-OMEGA] владельцу/команде модалку «купи Pro» не открываем
    if (isPrivileged) return;
    setUpsell({
      reason: reasonText || t('chat.limitReached'),
      limit: d.limit ?? null,
      usage: d.used ?? null,
      upsellPlan: d.upsell?.plan || 'pro',
      upsellPrice: d.upsell?.price ?? null,
    });
    planConfigApi.list({ timeout: 9000, noRetry: true })
      .then(res => {
        const plans = Array.isArray(res?.plans) ? res.plans : []
        const next = plans.find(p => p.plan === 'pro') || plans.find(p => p.plan !== 'free')
        if (next) setUpsell(prev => prev && ({ ...prev, upsellPlan: next.plan, upsellPrice: next.price }))
      })
      .catch(() => {})
  };
  // [CLIENT-JOURNEY-QA] внешний (useOmegaChat/CreativeHub) 402 тоже открывает UpsellModal
  useEffect(() => {
    if (externalQuotaError) openUpsell(externalQuotaError);
  }, [externalQuotaError]);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewPlatform, setPreviewPlatform] = useState('instagram');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef(null);
  const { speak, stop, playingId, loadingId, settings, setSettings } = useTTS();

  const submitFeedback = async (id, rating) => {
    try {
      await request(`/feedback/${id}/rate`, { method: 'POST', body: { rating } });
      setFeedbackGiven(rating);
      toast.success('Спасибо за оценку!', { icon: rating });
    } catch (e) {
      console.error('Feedback submit error:', e);
    }
  };

  useEffect(() => {
    const role = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
    if (role !== 'owner' && role !== 'admin') return;

    request('/admin/external-keys')
      .then(res => {
        const map = {};
        (res?.data || []).forEach(k => { map[k.provider] = k; });
        setElevenlabsStatus(map['elevenlabs'] || null);
      })
      .catch(err => {
        if (err?.message?.includes('403') || err?.status === 403) return;
        console.warn('[OmegaChat] external keys fetch failed', err);
      });
  }, [user?.role]);

  // [v9.9.2-MASTER-FIX] Fetch trial token quota for header counter
  useEffect(() => {
    if (!user?._id && !user?.id) return;
    request('/users/me/quota')
      .then(res => {
        const q = res?.data || res;
        setQuota(q);
      })
      .catch(err => {
        console.warn('[OmegaChat] quota fetch failed', err);
      });
  }, [user?._id, user?.id]);

  const input = externalInput !== undefined ? externalInput : internalInput;
  const setInput = externalSetInput || setInternalInput;
  const send = onSend || sendMessage;
  const isExternal = !!send;
  const userRole = externalUserRole || user?.role || 'guest';
  const messages = isExternal ? externalMessages : internalMessages;
  const quotaError = externalQuotaError !== undefined ? externalQuotaError : internalQuotaError;
  const loading = isLoading || externalTyping || internalIsTyping;
  // [CHAT-PRO З3] поиск: фильтр по тексту (user+ai), регистронезависимо; при поиске приветственный экран скрыт
  const searchNeedle = (searchQuery || '').trim().toLowerCase();
  const visibleMessages = searchNeedle
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchNeedle))
    : messages;
  const bottomRef = useRef(null);
  // [CHAT-PRO-FIX З5] скролл-навигация ленты: лента скроллится сама (страница — нет),
  // авто-скролл вниз только если пользователь внизу (или сам отправил), ↓/↑ кнопки, догрузка истории без прыжка
  const feedRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newWhileUp, setNewWhileUp] = useState(0);
  const [tallFeed, setTallFeed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const anchorRef = useRef(null);
  const lastCountRef = useRef(0);
  const HIST_PAGE = 30;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const scrollFeedTo = useCallback((top, smooth = true) => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
  }, [reducedMotion]);

  const onFeedScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const at = dist < 80;
    setAtBottom(at);
    if (at) setNewWhileUp(0);
    setTallFeed(el.scrollHeight > el.clientHeight * 3);
    // [З5.5] догрузка старых сообщений у верхней кромки — позиция НЕ прыгает (scroll-anchor)
    if (el.scrollTop < 40 && !searchNeedle && visibleCount < visibleMessages.length) {
      anchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      setVisibleCount(c => Math.min(c + HIST_PAGE, visibleMessages.length));
    }
  }, [searchNeedle, visibleCount, visibleMessages.length]);

  // восстановление позиции после догрузки сверху
  useLayoutEffect(() => {
    const el = feedRef.current;
    if (el && anchorRef.current) {
      el.scrollTop = anchorRef.current.top + (el.scrollHeight - anchorRef.current.height);
      anchorRef.current = null;
    }
  }, [visibleCount]);

  // [З5.4] авто-скролл: вниз — только если пользователь внизу; после СВОЕГО сообщения — всегда;
  // поднялся читать — не дёргаем, копим бейдж «новых»
  useEffect(() => {
    const count = messages.length;
    const prev = lastCountRef.current;
    lastCountRef.current = count;
    const grew = count > prev;
    const lastIsOwn = grew && isUserMessage(messages[count - 1]);
    if (grew && !atBottom && !lastIsOwn) {
      setNewWhileUp(n => n + (count - prev));
      return;
    }
    if (atBottom || lastIsOwn) {
      bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [messages, atBottom, reducedMotion]);

  // [З5.5] окно истории: рендерим последние visibleCount (при поиске — все совпадения)
  const windowedMessages = (!searchNeedle && visibleMessages.length > visibleCount)
    ? visibleMessages.slice(visibleMessages.length - visibleCount)
    : visibleMessages;

  const runQuickAction = (action) => {
    if (action.action === 'support') {
      setSupportMode(true);
      return;
    }
    const prompt = action.prompt.replace('{n}', String(variantCount));
    setInput(prompt);
  };

  const handleSendMessage = async (e, forcedText) => {
    if (e) e.preventDefault();

    // [CHAT-UNIFY ДОП-2б] forcedText — отправка по клику на чип приветственного экрана
    const text = (forcedText ?? input).trim();
    if (!text && !attachment) return;

    if (isExternal) {
      send?.(text);
      setInput("");
      setAttachment(null);
      return;
    }

    setFeedbackId(null);
    setFeedbackGiven(null);

    const userMsg = {
      role: 'user',
      text,
      timestamp: Date.now(),
      id: `u-${Date.now()}`,
    };
    setInternalMessages(prev => [...prev, userMsg]);
    setInput("");
    setAttachment(null);
    setInternalIsTyping(true);
    playSound('message-sent');

    try {
      console.log('[CHAT] Sending:', text.substring(0, 50));
      const res = await omegaApi.chat(text, messages.slice(-10), 'ru', userRole, user?._id || null);
      console.log('[CHAT] Received:', res);

      const reasoning = res?.data?.reasoning
        ? (Array.isArray(res.data.reasoning) ? res.data.reasoning : [res.data.reasoning])
        : [
            `${t('chat.step', { number: 1 })}: Анализирую запрос...`,
            `${t('chat.step', { number: 2 })}: Подбираю релевантные данные...`,
            `${t('chat.step', { number: 3 })}: Формирую ответ...`,
            `${t('chat.step', { number: 4 })}: Проверяю соответствие...`,
          ];
      const aiMsg = {
        role: 'omega',
        text: res?.data?.response || res?.text || res?.message || '...',
        provider: res?.provider || res?.data?.provider,
        reasoning,
        // [YT-DATA-REAL-STATS] люкс-карточка анализа + результат действия (обложка/драфт/best time)
        videoAnalysis: res?.data?.videoAnalysis || null,
        action: res?.data?.action || null,
        timestamp: Date.now(),
        id: `a-${Date.now()}`,
      };
      setInternalMessages(prev => [...prev, aiMsg]);
      playSound('notification');

      // [v9.9.17-ANTI-FAIL] save feedback stub
      try {
        const fbRes = await request('/feedback', {
          method: 'POST',
          body: { message: text, response: aiMsg.text, context: 'web' }
        });
        if (fbRes?.id) setFeedbackId(fbRes.id);
      } catch (e) { console.error('[CHAT] feedback save failed:', e); }
    } catch (err) {
      console.error('[CHAT] Error:', err);
      const status = err?.status || err?.response?.status;
      const errMessage = err?.data?.message || err?.response?.data?.message || err?.message;
      const isQuotaError = status === 402 || err?.data?.code === 'TRIAL_EXHAUSTED' || err?.data?.code === 'QUOTA_EXCEEDED';
      setInternalMessages(prev => [...prev, {
        role: 'omega',
        text: isQuotaError ? (errMessage || t('chat.limitReached')) : t('chat.serverUnavailable'),
        isError: true,
        isQuotaError,
        timestamp: Date.now(),
        id: `err-${Date.now()}`,
      }]);
      if (isQuotaError) {
        toast.error(errMessage || t('chat.limitReached'), { duration: 5000, icon: '⚡' });
        // [CLIENT-JOURNEY-QA] UpsellModal с живой ценой из PlanConfig (фолбэк — pro из ответа)
        openUpsell(err?.data || {}, errMessage);
      }
      playSound('error');
    } finally {
      setInternalIsTyping(false);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error(t('chat.micNotSupported'), { duration: 4000, icon: '🎙️' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const langMap = { ru: 'ru-RU', en: 'en-US', es: 'es-ES', zh: 'zh-CN' };
    recognition.lang = langMap[recognitionLang] || 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // [OMEGA-VIDEO ДОП-З1 П3] лимит веса медиа — из кабинета владельца (/api/upload/limits, hot-reload ≤60с)
  // [OMEGA-VIDEO ДОП-2] та же ручка отдаёт живые цены ✦ (разбор/обложка/сценарий) и TTL хранения
  const [actionPricing, setActionPricing] = useState({ videoAnalysisCost: 1, coverGenerationCost: 1, scriptGenerationCost: 2, videoStorageTtlHours: 0 });
  const refreshUploadLimits = () => {
    request('/upload/limits', { timeout: 8000, noRetry: true })
      .then(res => {
        if (res?.maxMb) setMediaLimitMb(res.maxMb);
        if (res?.videoAnalysisCost) {
          setActionPricing({
            videoAnalysisCost: res.videoAnalysisCost,
            coverGenerationCost: res.coverGenerationCost ?? 1,
            scriptGenerationCost: res.scriptGenerationCost ?? 2,
            videoStorageTtlHours: res.videoStorageTtlHours ?? 0,
          });
        }
      })
      .catch(() => {});
  };
  useEffect(() => {
    refreshUploadLimits();
  }, []);

  const VIDEO_EXT_RE = /\.(mp4|mov|webm)$/i;
  const isVideoFile = (file) => file.type.startsWith('video/') || VIDEO_EXT_RE.test(file.name || '');
  const formatMb = (bytes) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type.startsWith('image/')) {
      attachImageFile(file);
      return;
    }
    if (isVideoFile(file)) {
      attachVideoFile(file);
      return;
    }
    toast(t('chat.fileSoon'), { duration: 4000, icon: '📎' });
  };

  const attachImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => setAttachment({ name: file.name, type: file.type, base64: ev.target.result });
    reader.readAsDataURL(file);
  };

  // [OMEGA-VIDEO ДОП-З1 П5] кадры для разбора тянем на клиенте (canvas), ffmpeg не нужен
  const extractVideoFrames = (file, count = 6) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('video metadata timeout')); }, 15000);
    video.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error('video load failed')); };
    video.onloadedmetadata = async () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / (video.videoWidth || 640));
        canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
        const ctx = canvas.getContext('2d');
        const frames = [];
        for (let i = 0; i < count; i++) {
          const time = duration ? Math.min((duration * i) / (count - 1), Math.max(0, duration - 0.1)) : 0;
          await new Promise((res) => {
            video.addEventListener('seeked', () => res(), { once: true });
            setTimeout(res, 2000); // страховка от зависшего seek
            video.currentTime = time;
          });
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.6));
          } catch { /* кадр пропущен */ }
        }
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({ frames, meta: { durationSec: duration, width: video.videoWidth, height: video.videoHeight } });
      } catch (err) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    video.src = url;
  });

  // внешний режим (CreativeHub/useOmegaChat) — сообщения через injectMessages, иначе лента их не покажет
  const pushChatMessages = (msgs) => {
    const stamped = msgs.map(m => (isExternal ? { ...m, timestamp: new Date().toISOString() } : m));
    if (isExternal) injectMessages?.(stamped);
    else setInternalMessages(prev => [...prev, ...stamped]);
  };

  // [OMEGA-VIDEO ДОП-З1 П5] после загрузки файл сразу уходит в работу Омеге (таймкоды/хук/удержание)
  const runVideoAnalysis = async (video) => {
    const pushMsgs = pushChatMessages;
    pushMsgs([{
      role: 'user',
      text: t('chat.videoUserMsg', { name: video.name, size: video.sizeMb }),
      timestamp: Date.now(),
      id: `u-${Date.now()}`,
    }]);
    setInternalIsTyping(true);
    playSound('message-sent');
    try {
      const res = await request('/omega/analyze-video-upload', {
        method: 'POST',
        noRetry: true,
        body: JSON.stringify({
          videoUrl: video.url,
          frames: videoFramesRef.current || [],
          meta: { name: video.name, sizeMb: video.sizeMb, ...videoMetaRef.current },
          lang: 'ru',
        }),
      });
      // [OMEGA-VIDEO] 200 + success:false — ожидаемая деградация (ai_unavailable): честное сообщение, не мок
      if (res && res.success === false) {
        pushMsgs([{
          role: 'omega',
          text: res.message || t('chat.serverUnavailable'),
          isError: true,
          timestamp: Date.now(),
          id: `err-${Date.now()}`,
        }]);
        playSound('error');
        return;
      }
      pushMsgs([{
        role: 'omega',
        text: res?.analysis || '...',
        // [OMEGA-VIDEO ДОП-2 З5] из разбора можно сразу собрать обложки (тема = файл/разбор)
        action: { type: 'videoAnalysis', name: video.name },
        timestamp: Date.now(),
        id: `a-${Date.now()}`,
      }]);
      playSound('notification');
      setVideoUpload(null);
      videoFramesRef.current = [];
      videoMetaRef.current = {};
      if (res?.quota?.trialTokens !== undefined) {
        setQuota(prev => prev ? { ...prev, trialTokens: res.quota.trialTokens } : prev);
      }
    } catch (err) {
      const isQuotaError = err?.status === 402;
      pushMsgs([{
        role: 'omega',
        text: isQuotaError ? (err.message || t('chat.limitReached')) : t('chat.serverUnavailable'),
        isError: true,
        isQuotaError,
        timestamp: Date.now(),
        id: `err-${Date.now()}`,
      }]);
      if (isQuotaError) {
        toast.error(err.message || t('chat.limitReached'), { duration: 5000, icon: '⚡' });
        openUpsell({}, err.message);
      }
      playSound('error');
    } finally {
      setInternalIsTyping(false);
    }
  };

  // [OMEGA-VIDEO ДОП-З1 П4] XHR: прогресс %, отмена через abort, обрыв сети → честная ошибка + повтор
  const startVideoUpload = (file) => {
    const xhr = new XMLHttpRequest();
    videoXhrRef.current = xhr;
    setVideoUpload({ name: file.name, sizeMb: formatMb(file.size), status: 'uploading', progress: 0, url: null, file });
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setVideoUpload(prev => (prev ? { ...prev, progress: pct } : prev));
      }
    };
    xhr.onload = () => {
      videoXhrRef.current = null;
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* не-JSON ответ */ }
      if (xhr.status >= 200 && xhr.status < 300 && data?.success && data?.url) {
        const done = { name: file.name, sizeMb: formatMb(file.size), status: 'ready', progress: 100, url: data.url, file };
        setVideoUpload(done);
        runVideoAnalysis(done);
        return;
      }
      if (xhr.status === 413 && data?.limitMb) {
        setVideoUpload(null);
        toast.error(t('chat.videoTooLarge', { limit: data.limitMb, size: data.fileMb ?? formatMb(file.size) }), { duration: 5000, icon: '🎬' });
        return;
      }
      setVideoUpload(prev => (prev ? { ...prev, status: 'error' } : prev));
      toast.error(t('chat.videoUploadFailed'), { duration: 5000, icon: '🎬' });
    };
    xhr.onerror = () => {
      videoXhrRef.current = null;
      setVideoUpload(prev => (prev ? { ...prev, status: 'error' } : prev));
      toast.error(t('chat.videoUploadFailed'), { duration: 5000, icon: '🎬' });
    };
    xhr.onabort = () => { videoXhrRef.current = null; };
    xhr.open('POST', `${API_URL}/upload/media`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token') || ''}`);
    const fd = new FormData();
    fd.append('media', file);
    xhr.send(fd);
  };

  const cancelVideoUpload = () => {
    videoXhrRef.current?.abort();
    videoXhrRef.current = null;
    setVideoUpload(null);
    videoFramesRef.current = [];
    videoMetaRef.current = {};
  };

  const retryVideoUpload = () => {
    const file = videoUpload?.file;
    if (file) startVideoUpload(file);
  };

  const attachVideoFile = (file) => {
    // [OMEGA-VIDEO ДОП-З1 П3] превышение лимита — понятный текст, не молчание и не краш
    if (mediaLimitMb && file.size > mediaLimitMb * 1024 * 1024) {
      toast.error(t('chat.videoTooLarge', { limit: mediaLimitMb, size: formatMb(file.size) }), { duration: 5000, icon: '🎬' });
      return;
    }
    setAttachment(null);
    videoFramesRef.current = [];
    videoMetaRef.current = {};
    // [OMEGA-VIDEO ДОП-2] цена на чипе ДО анализа — живая из кабинета владельца (поставил 3✦ → клиент видит 3✦ сразу)
    refreshUploadLimits();
    extractVideoFrames(file)
      .then(({ frames, meta }) => { videoFramesRef.current = frames; videoMetaRef.current = meta; })
      .catch(() => {});
    startVideoUpload(file);
  };

  // [OMEGA-VIDEO ДОП-2 З4] «Сценарий из мысли»: идея любым форматом (текст/голос через диктофон
  // инпута/ссылка) → уточнение цели (платформа/диапазон/ниша) → сценарий → драфт в Планировщик.
  // Цена ✦ из кабинета владельца показана ДО запуска (actionPricing.scriptGenerationCost).
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptForm, setScriptForm] = useState({ idea: '', platform: '', viewsRange: '', niche: '' });
  const [scriptBusy, setScriptBusy] = useState(false);
  const [plannerBusyId, setPlannerBusyId] = useState(null);
  const scriptModalRef = useModalA11y(useCallback(() => setScriptModalOpen(false), []), scriptModalOpen);

  const openScriptModal = () => {
    refreshUploadLimits(); // живая цена из кабинета владельца
    setScriptForm(prev => ({ ...prev, idea: prev.idea || input.trim() }));
    setScriptModalOpen(true);
  };

  const submitScriptFromIdea = async () => {
    const idea = scriptForm.idea.trim();
    if (!idea) { toast.error(t('chat.scriptIdeaRequired'), { duration: 4000, icon: '🎬' }); return; }
    setScriptBusy(true);
    playSound('message-sent');
    try {
      const res = await request('/omega/script-from-idea', {
        method: 'POST',
        noRetry: true,
        body: JSON.stringify({ idea, platform: scriptForm.platform, viewsRange: scriptForm.viewsRange, niche: scriptForm.niche.trim(), lang: 'ru' }),
      });
      if (res && res.success === false) {
        const quotaError = res.code === 'TRIAL_EXHAUSTED' || res.code === 'QUOTA_EXCEEDED';
        pushChatMessages([{ role: 'omega', text: res.message || t('chat.serverUnavailable'), isError: true, isQuotaError: quotaError, timestamp: Date.now(), id: `err-${Date.now()}` }]);
        if (quotaError) openUpsell({}, res.message);
        playSound('error');
        return;
      }
      if (res?.needClarification) {
        // Омега уточняет цель — подсвечиваем недостающие поля модалки, ✦ не списаны
        toast(t('chat.scriptClarify', { cost: res.cost ?? actionPricing.scriptGenerationCost }), { duration: 5000, icon: '🎯' });
        return;
      }
      pushChatMessages([
        { role: 'user', text: t('chat.scriptUserMsg', { idea: idea.slice(0, 120) }), timestamp: Date.now(), id: `u-${Date.now()}` },
        {
          role: 'omega',
          text: res?.script || '...',
          action: { type: 'script', platform: scriptForm.platform, niche: scriptForm.niche.trim(), viewsRange: scriptForm.viewsRange, nicheStats: res?.nicheStats || null, cost: res?.cost },
          timestamp: Date.now(),
          id: `a-${Date.now()}`,
        },
      ]);
      playSound('notification');
      setScriptModalOpen(false);
      setScriptForm({ idea: '', platform: '', viewsRange: '', niche: '' });
      if (res?.quota?.trialTokens !== undefined) {
        setQuota(prev => prev ? { ...prev, trialTokens: res.quota.trialTokens } : prev);
      }
    } catch (err) {
      const isQuotaError = err?.status === 402;
      pushChatMessages([{ role: 'omega', text: isQuotaError ? (err.message || t('chat.limitReached')) : t('chat.serverUnavailable'), isError: true, isQuotaError, timestamp: Date.now(), id: `err-${Date.now()}` }]);
      if (isQuotaError) { toast.error(err.message || t('chat.limitReached'), { duration: 5000, icon: '⚡' }); openUpsell({}, err.message); }
      playSound('error');
    } finally {
      setScriptBusy(false);
    }
  };

  // [OMEGA-VIDEO ДОП-2 З4] драфт сценария в Планировщик в 1 клик (status:'draft', не публикуется)
  const sendScriptToPlanner = async (msg) => {
    if (plannerBusyId) return;
    setPlannerBusyId(msg.id);
    try {
      const res = await request('/scheduler/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: (msg.text || '').split('\n')[0].slice(0, 80) || t('chat.scriptPlannerTitle'),
          content: msg.text,
          platforms: msg.action?.platform ? [msg.action.platform] : [],
          types: ['video'],
          status: 'draft',
          scheduledAt: new Date().toISOString(),
        }),
      });
      if (res?.status === 'success') {
        toast.success(t('chat.scriptPlannerOk'), { duration: 4000, icon: '📅' });
        // [OMEGA-VIDEO ДОП-2 З5.3] запоминаем драфт — обложку «Применить к посту» вешаем на него
        const postId = res?.data?._id || res?.data?.id;
        if (postId) setPostIdByMsg(prev => ({ ...prev, [msg.id]: postId }));
      } else {
        toast.error(res?.message || t('chat.serverUnavailable'), { duration: 4000 });
      }
    } catch (err) {
      toast.error(err?.message || t('chat.serverUnavailable'), { duration: 4000 });
    } finally {
      setPlannerBusyId(null);
    }
  };

  // [OMEGA-VIDEO ДОП-2 З5] Обложки: 3 варианта (размер фактом под платформу, текст 2–4 слова
  // из анализа/сценария sharp-оверлеем) → клиент ✅ → применить к посту / скачать.
  // Цена ✦ из кабинета владельца на кнопке ДО запуска.
  const [coversByMsg, setCoversByMsg] = useState({});
  const [coversBusyId, setCoversBusyId] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null); // {url, width, height} — превью 1:1 до применения
  const [coverBusyApply, setCoverBusyApply] = useState(false);
  const [postIdByMsg, setPostIdByMsg] = useState({});
  const coverPreviewRef = useModalA11y(useCallback(() => setCoverPreview(null), []), !!coverPreview);
  const uploadsOrigin = API_BASE_URL.replace(/\/api$/, '');
  const coverSrc = (url) => (url?.startsWith('http') ? url : `${uploadsOrigin}${url}`);

  // 2–4 слова текста обложки из раздела «ОБЛОЖКА» сценария; фолбэк — первые слова темы
  const coverTextFromScript = (text, fallbackTopic) => {
    const m = /обложка[^\n]*\n[:\-– ]*([^\n]+)/i.exec(text || '');
    const raw = (m?.[1] || fallbackTopic || '').replace(/[*#>`]/g, '').trim();
    return raw.split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  };

  const generateCovers = async (msg) => {
    if (coversBusyId) return;
    refreshUploadLimits();
    setCoversBusyId(msg.id);
    playSound('message-sent');
    try {
      const topic = msg.action?.niche || msg.action?.name || (msg.text || '').split('\n')[0].slice(0, 120);
      const coverText = msg.action?.type === 'script'
        ? coverTextFromScript(msg.text, msg.action?.niche || topic)
        : String(msg.action?.name || topic).replace(/\.[a-z0-9]+$/i, '').split(/\s+/).slice(0, 4).join(' ');
      const res = await request('/omega/cover-variants', {
        method: 'POST',
        noRetry: true,
        body: JSON.stringify({ topic, coverText, platform: msg.action?.platform || 'youtube' }),
      });
      if (res && res.success === false) {
        const quotaError = res.code === 'TRIAL_EXHAUSTED' || res.code === 'QUOTA_EXCEEDED';
        toast.error(res.message || t('chat.serverUnavailable'), { duration: 5000, icon: '🎨' });
        if (quotaError) openUpsell({}, res.message);
        playSound('error');
        return;
      }
      if (Array.isArray(res?.variants) && res.variants.length) {
        setCoversByMsg(prev => ({ ...prev, [msg.id]: { variants: res.variants, selected: 0 } }));
        playSound('notification');
        if (res?.quota?.trialTokens !== undefined) {
          setQuota(prev => prev ? { ...prev, trialTokens: res.quota.trialTokens } : prev);
        }
      }
    } catch (err) {
      const isQuotaError = err?.status === 402;
      toast.error(err?.message || t('chat.serverUnavailable'), { duration: 5000, icon: '🎨' });
      if (isQuotaError) openUpsell({}, err?.message);
      playSound('error');
    } finally {
      setCoversBusyId(null);
    }
  };

  // Применить выбранную обложку к драфту в Планировщике (если драфт создан)
  const applyCoverToPost = async (msg) => {
    const state = coversByMsg[msg.id];
    const variant = state?.variants?.[state.selected];
    const postId = postIdByMsg[msg.id];
    if (!variant || !postId || coverBusyApply) return;
    setCoverBusyApply(true);
    try {
      const res = await request(`/scheduler/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaUrl: coverSrc(variant.url), mediaType: 'image', mediaName: 'cover.jpg' }),
      });
      if (res?.status === 'success') toast.success(t('chat.coverApplied'), { duration: 4000, icon: '✅' });
      else toast.error(res?.message || t('chat.serverUnavailable'), { duration: 4000 });
    } catch (err) {
      toast.error(err?.message || t('chat.serverUnavailable'), { duration: 4000 });
    } finally {
      setCoverBusyApply(false);
    }
  };

  const hasDraggedFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const handleDragEnter = (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e) => {
    if (!hasDraggedFiles(e)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      attachImageFile(file);
      return;
    }
    // [OMEGA-VIDEO ДОП-З1 П1] drop видео — тот же паттерн, что у картинок
    if (isVideoFile(file)) {
      attachVideoFile(file);
      return;
    }
    toast(t('chat.fileSoon'), { duration: 4000, icon: '📎' });
  };

  const openPlatformPreview = (html) => {
    const htmlMatch = html.match(/<html[\s\S]*?<\/html>|<!DOCTYPE[\s\S]*?<\/html>/i);
    setPreviewHtml(htmlMatch ? htmlMatch[0] : html);
  };

  const PLATFORM_STYLES = {
    instagram: { width: 360, header: 'Instagram', bg: 'bg-white' },
    tiktok: { width: 360, header: 'TikTok', bg: 'bg-black' },
    telegram: { width: 400, header: 'Telegram', bg: 'bg-[#1c1c1d]' },
    youtube: { width: 480, header: 'YouTube', bg: 'bg-white' }
  };

  return (
    <div
      className={`relative flex flex-col bg-[#0a0a0f] text-white ${embedded ? 'chat-pro-embed' : ''} ${variant === 'fullscreen' ? 'h-[100dvh] md:h-[calc(100vh-80px)]' : 'h-full min-h-0'}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-violet-950/60 backdrop-blur-sm border-2 border-dashed border-violet-400/70 rounded-none pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-2xl bg-[#0a0a0f]/80 border border-violet-400/30 shadow-xl shadow-violet-500/20">
            <FileUp className="w-10 h-10 text-violet-300 animate-bounce" />
            <p className="text-sm font-medium text-violet-200 text-center">{t('chat.dropHint')}</p>
          </div>
        </div>
      )}
      {!embedded && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center animate-pulse shadow-lg shadow-violet-500/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]"></span>
            </div>
            <div>
              <div className="text-sm font-semibold">{t('appName')}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                {loading ? t('omega.thinking') : t('omega.ready')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-tour="token-counter"
              onClick={() => setQuotaOpen(true)}
              aria-label={t('quota.title')}
              className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono hover:border-violet-500/40 hover:text-violet-200 transition-colors"
            >
              ⚡ {quota?.trialTokens ?? user?.trialTokens ?? 0} / 10
            </button>
            <OmegaLocalModeIndicator />
          </div>
        </div>
      )}

      {/* [CHAT-PRO-FIX З5] скроллится ТОЛЬКО лента (шапка/композер на месте); обёртка relative — для ↓/↑ */}
      <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={feedRef}
        onScroll={onFeedScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden omega-chat-scroll touch-pan-y scroll-smooth p-4 space-y-4"
        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {/* [CHAT-UNIFY ДОП-2б] пустой чат у новичка НЕ пустой: «Что умею» + кликабельные чипы-примеры (по роли) */}
        {messages.length === 0 && !searchNeedle && (
          <div className="flex flex-col items-center justify-center min-h-[55%] text-center gap-4 py-8 animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('chat.welcome.title')}</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-[420px] mx-auto">{t('chat.welcome.subtitle')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-[520px]">
              {welcomeChipsForRole(userRole).map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendMessage(null, chip.prompt)}
                  className="px-4 min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-200 hover:bg-violet-500/20 hover:text-violet-200 hover:border-violet-500/30 transition-all disabled:opacity-50"
                >
                  {chip.icon} {t(chip.label)}
                </button>
              ))}
            </div>
          </div>
        )}
        {searchNeedle && visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40%] text-center gap-2 py-10">
            <p className="text-sm text-gray-400">{t('chatPro.searchEmpty')}</p>
          </div>
        )}
        {windowedMessages.map((msg, i) => (
          <div key={msg.id || i} className={isUserMessage(msg) ? "flex justify-end" : "flex flex-col items-start"}>
            {isAiMessage(msg) ? (
              <>
                <AiMessageContent text={msg.text} t={t} />
                {msg.videoAnalysis && <YouTubeAnalysisCard data={msg.videoAnalysis} variant="compact" />}
                {msg.action?.type === 'cover' && msg.action.success && msg.action.url && (
                  <div className="w-full max-w-[95%] mx-auto mb-3">
                    <img src={msg.action.url} alt="AI cover" className="w-full rounded-2xl border border-white/10" loading="lazy" />
                  </div>
                )}
                {(msg.action?.type === 'script' || msg.action?.type === 'videoAnalysis') && (
                  <div className="w-full max-w-[95%] mx-auto mb-3" data-testid="script-action">
                    {msg.action.nicheStats?.available && Array.isArray(msg.action.nicheStats.videos) && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-2">
                        <p className="text-[11px] text-gray-400 mb-1.5">{t('chat.scriptNicheTop')}</p>
                        {msg.action.nicheStats.videos.map(v => (
                          <p key={v.videoId} className="text-[11px] text-gray-300 truncate">
                            {v.title} — <span className="text-violet-300">{v.views?.toLocaleString('ru-RU')}</span> {t('chat.scriptViews')}
                          </p>
                        ))}
                      </div>
                    )}
                    {msg.action.nicheStats && !msg.action.nicheStats.available && (
                      <p className="text-[11px] text-amber-400/80 mb-2">{t('chat.scriptNicheUnavailable')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {msg.action?.type === 'script' && (
                        <button
                          type="button"
                          disabled={plannerBusyId === msg.id}
                          onClick={() => sendScriptToPlanner(msg)}
                          data-testid="script-to-planner"
                          className="px-3 py-1.5 min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-200 hover:bg-violet-500/20 hover:text-violet-200 hover:border-violet-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CalendarPlus size={14} /> {plannerBusyId === msg.id ? t('common.loading') : t('chat.scriptToPlanner')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={coversBusyId === msg.id}
                        onClick={() => generateCovers(msg)}
                        data-testid="covers-generate"
                        className="px-3 py-1.5 min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-200 hover:bg-violet-500/20 hover:text-violet-200 hover:border-violet-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {coversBusyId === msg.id ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🎨'} {t('chat.coversGenerateBtn', { cost: actionPricing.coverGenerationCost })}
                      </button>
                    </div>
                    {coversByMsg[msg.id]?.variants && (
                      <div className="mt-3" data-testid="covers-grid">
                        <div className="grid grid-cols-3 gap-2">
                          {coversByMsg[msg.id].variants.map((v, idx) => (
                            <button
                              key={v.url}
                              type="button"
                              onClick={() => setCoversByMsg(prev => ({ ...prev, [msg.id]: { ...prev[msg.id], selected: idx } }))}
                              onDoubleClick={() => setCoverPreview(v)}
                              className={`relative rounded-lg overflow-hidden border-2 transition ${coversByMsg[msg.id].selected === idx ? 'border-violet-400' : 'border-white/10 hover:border-white/25'}`}
                              data-testid={`cover-variant-${idx}`}
                              title={t('chat.coverPickHint')}
                            >
                              <img src={coverSrc(v.url)} alt={`cover ${idx + 1}`} className="w-full h-auto block" loading="lazy" />
                              {coversByMsg[msg.id].selected === idx && (
                                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 text-white text-[11px] flex items-center justify-center">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setCoverPreview(coversByMsg[msg.id].variants[coversByMsg[msg.id].selected])}
                            className="px-3 py-1.5 min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-gray-300 hover:bg-white/[0.1] transition flex items-center gap-1.5"
                          >
                            <Eye size={13} /> {t('chat.coverPreviewBtn')}
                          </button>
                          {postIdByMsg[msg.id] && (
                            <button
                              type="button"
                              disabled={coverBusyApply}
                              onClick={() => applyCoverToPost(msg)}
                              data-testid="cover-apply"
                              className="px-3 py-1.5 min-h-[44px] rounded-full bg-violet-500/20 border border-violet-500/30 text-xs text-violet-200 hover:bg-violet-500/30 transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <Check size={13} /> {t('chat.coverApplyBtn')}
                            </button>
                          )}
                          <a
                            href={coverSrc(coversByMsg[msg.id].variants[coversByMsg[msg.id].selected]?.url)}
                            download="cover.jpg"
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-gray-300 hover:bg-white/[0.1] transition flex items-center gap-1.5"
                          >
                            ⬇ {t('chat.coverDownloadBtn')}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <ReasoningSteps reasoning={msg.reasoning} t={t} />
                <div className="flex flex-wrap items-center gap-2 mt-2 max-w-[95%] mx-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await speak(msg.text, msg.id);
                      if (res?.placeholder) {
                        if (res?.mock) {
                          toast.success(t('voice.mockToast'), { duration: 3000, icon: '🔊' });
                        } else {
                          toast(t('voiceMode.placeholder'), { duration: 3000, icon: '🔊' });
                        }
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition ${
                      playingId === msg.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {loadingId === msg.id ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : playingId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {playingId === msg.id ? t('voiceMode.stop') : t('voiceMode.speak')}
                    {!elevenlabsStatus?.isActive && (
                      <span title={t('voice.mockToast')} className="ml-0.5 text-yellow-400"><AlertTriangle size={10} /></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSettings(true)}
                    className="px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-white transition"
                  >
                    <Settings size={14} /> {t('voiceMode.settings')}
                  </button>
                  {msg.text?.includes('<html') && (
                    <button
                      type="button"
                      onClick={() => openPlatformPreview(msg.text)}
                      className="px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-white transition"
                    >
                      <Eye size={14} /> {t('chat.preview') || 'Preview'}
                    </button>
                  )}
                </div>
                <div data-tour="quick-actions" className="flex flex-wrap gap-2 mt-3 max-w-[95%] mx-auto">
                  {actionButtonsForRole(userRole).map(action => (
                    <button
                      key={action.id}
                      onClick={() => runQuickAction(action)}
                      type="button"
                      disabled={loading}
                      className="px-3 py-1.5 min-w-[44px] min-h-[44px] rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all disabled:opacity-50"
                    >
                      {action.icon} {t(action.label)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="omega-user-bubble bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-2xl rounded-tr-none p-3.5 max-w-[95%] mx-auto">
                <p className="text-sm text-white whitespace-pre-wrap">{msg.text}</p>
                {msg.time && <p className="text-[10px] text-gray-500 text-right mt-1">{msg.time}</p>}
              </div>
            )}
          </div>
        ))}
        {/* [CHAT-PRO З3] скелетон набора ответа — в т.ч. в embedded-режиме Люкс-хаба, где своей шапки со статусом нет */}
        {loading && !searchNeedle && (
          <div className="flex flex-col items-start" role="status" aria-label={t('omega.thinking')}>
            <div className="w-full max-w-[95%] mx-auto rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/[0.08] p-4 space-y-2.5 animate-pulse motion-reduce:animate-none">
              <div className="h-3 rounded bg-white/[0.08] w-3/4" />
              <div className="h-3 rounded bg-white/[0.08] w-full" />
              <div className="h-3 rounded bg-white/[0.08] w-1/2" />
            </div>
          </div>
        )}
        {feedbackId && !feedbackGiven && (
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="text-xs text-gray-400">{t('chat.ratePrompt')}</span>
              <button onClick={() => submitFeedback(feedbackId, '👍')} className="text-lg hover:scale-110 transition">👍</button>
              <button onClick={() => submitFeedback(feedbackId, '👎')} className="text-lg hover:scale-110 transition">👎</button>
            </div>
          </div>
        )}
        {feedbackGiven && (
          <div className="text-center text-xs text-gray-500 mt-1">{t('chat.feedbackThanks')} {feedbackGiven}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* [CHAT-PRO-FIX З5.3] ↑ к началу (лента >3 экранов) и ↓ к последнему (выше низа >1 экрана,
          бейдж новых) — плавают над лентой у её низа, над композером справа */}
      {tallFeed && (
        <button
          type="button"
          onClick={() => scrollFeedTo(0)}
          aria-label={t('chatPro.toTop')}
          className="absolute top-2 right-4 z-10 min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a24]/95 border border-white/15 text-gray-200 shadow-lg hover:border-violet-500/40 transition"
        >
          <ChevronUp size={18} />
        </button>
      )}
      {!atBottom && messages.length > 0 && (
        <button
          type="button"
          data-tour="scroll-latest"
          onClick={() => { scrollFeedTo(feedRef.current?.scrollHeight ?? 0); setNewWhileUp(0) }}
          aria-label={t('chatPro.toLatest')}
          className="absolute bottom-3 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 px-3 rounded-full bg-violet-600/95 border border-violet-400/40 text-white text-xs font-bold shadow-lg shadow-violet-900/40 hover:bg-violet-500 transition"
        >
          <ChevronDown size={16} />
          {newWhileUp > 0 && <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-500 text-[10px] leading-none">{newWhileUp}</span>}
        </button>
      )}
      </div>

      {supportMode && (
        <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-[#0a0a0f]/60 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">{t('chat.newTicket')}</h4>
            <button onClick={() => setSupportMode(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <input
            type="text"
            placeholder={t('chat.subject')}
            value={ticketForm.subject}
            onChange={e => setTicketForm(p => ({...p, subject: e.target.value}))}
            className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-violet-500 outline-none"
          />
          <textarea
            placeholder={t('chat.description')}
            value={ticketForm.description}
            onChange={e => setTicketForm(p => ({...p, description: e.target.value}))}
            rows={3}
            className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-violet-500 outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await request('/support', {
                    method: 'POST',
                    body: {
                      subject: ticketForm.subject || t('chat.newTicket'),
                      description: ticketForm.description
                    }
                  });
                } catch (e) {
                  console.error('[OmegaChat] ticket submit failed:', e);
                }
                setSupportMode(false);
                setTicketForm({ subject: '', description: '', screenshot: null });
                const systemMsg = {
                  role: 'system',
                  text: t('chat.ticketSent'),
                  timestamp: Date.now(),
                  id: `sys-${Date.now()}`,
                };
                if (isExternal) {
                  // В embedded режиме не управляем внешними сообщениями
                } else {
                  setInternalMessages(prev => [...prev, systemMsg]);
                }
              }}
              disabled={!ticketForm.description.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition disabled:opacity-40"
            >
              {t('chat.send')}
            </button>
            <button onClick={() => setSupportMode(false)} className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:text-white transition">{t('chat.cancel')}</button>
          </div>
          <p className="mt-2 text-[10px] text-gray-500">
            {t('chat.orTelegram')} <a href={CLIENT_BOT_URL} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">Telegram</a>
          </p>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="flex-shrink-0 z-30 p-3 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-2 px-1 mb-2 text-xs text-gray-400">
          <span>{t('chat.variants')}:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={variantCount}
            onChange={(e) => setVariantCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            className="w-12 bg-white/5 rounded-lg text-center text-white border border-white/10 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-1 mb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSupportMode(true)}
              className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] text-xs text-gray-300 hover:text-white transition"
            >
              <MessageCircle className="w-3.5 h-3.5" /> {t('chat.support') || 'Поддержка'}
            </button>
            <button
              type="button"
              onClick={() => window.open(CLIENT_BOT_URL, '_blank')}
              className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] text-xs text-gray-300 hover:text-white transition"
            >
              <TelegramIcon className="w-3.5 h-3.5" /> {t('chat.telegram') || 'Telegram'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12] transition"
            title={t('chat.attach') || 'Прикрепить'}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={openScriptModal}
            data-testid="script-from-idea-btn"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12] transition"
            title={t('chat.scriptFromIdeaTitle', { cost: actionPricing.scriptGenerationCost })}
          >
            <Clapperboard className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm,.mov"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            data-tour="omega-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder || t('chat.placeholder')}
            disabled={loading}
            className="flex-1 min-w-0 h-12 bg-transparent text-base outline-none text-white placeholder-gray-500 disabled:opacity-50"
          />
          <select
            value={recognitionLang}
            onChange={(e) => { setRecognitionLang(e.target.value); localStorage.setItem('omega_recognition_lang', e.target.value); }}
            className="h-10 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none"
          >
            <option value="ru">RU</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="zh">ZH</option>
          </select>
          <button
            data-tour="voice-input"
            onClick={startVoiceInput}
            type="button"
            disabled={loading}
            aria-label={isRecording ? t('chat.recording') : t('chat.voiceMode')}
            className={`min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-xl transition-all relative ${
              isRecording
                ? 'text-rose-500 animate-pulse'
                : 'text-gray-400 hover:text-violet-300 hover:bg-white/[0.06]'
            }`}
          >
            <Mic className="w-5 h-5" />
            {isRecording && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
          <button
            type="submit"
            disabled={!input.trim() && !attachment || loading}
            aria-label={t('chat.send')}
            className="min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {attachment && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <img src={attachment.base64} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
            <span className="text-xs text-gray-400 truncate flex-1">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>
        )}
        {videoUpload && (
          <div className="mt-2 px-2" data-testid="video-upload-chip">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-violet-300 shrink-0" />
              <span className="text-xs text-gray-300 truncate flex-1">{videoUpload.name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{videoUpload.sizeMb} МБ</span>
              {videoUpload.status === 'uploading' && (
                <span className="text-[10px] text-violet-300 shrink-0 w-9 text-right" data-testid="video-upload-progress">{videoUpload.progress}%</span>
              )}
              {videoUpload.status === 'error' && (
                <button
                  type="button"
                  onClick={retryVideoUpload}
                  className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 shrink-0 min-h-[32px]"
                >
                  <RotateCcw className="w-3 h-3" /> {t('chat.retryUpload')}
                </button>
              )}
              <button
                type="button"
                onClick={cancelVideoUpload}
                aria-label={t('common.cancel', 'Отмена')}
                className="text-gray-400 hover:text-white text-xs min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
              >✕</button>
            </div>
            {videoUpload.status === 'uploading' && (
              <div className="h-1 mt-1.5 rounded-full bg-white/10 overflow-hidden motion-reduce:transition-none">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${videoUpload.progress}%` }}
                />
              </div>
            )}
            {videoUpload.status === 'error' && (
              <p className="text-[10px] text-rose-400 mt-1">{t('chat.videoUploadFailed')}</p>
            )}
            <p className="text-[10px] text-gray-500 mt-1" data-testid="video-upload-price">
              {t('chat.videoPrice', { cost: actionPricing.videoAnalysisCost, left: (quota?.unlimited || user?.role === 'owner') ? '∞' : (quota?.trialTokens ?? user?.trialTokens ?? 0) })}
            </p>
          </div>
        )}
        {isRecording && (
          <p className="text-[10px] text-rose-400 text-center mt-1.5 animate-pulse">
            {t('chat.listening')}
          </p>
        )}
        {quota && !quotaError && !quota.unlimited && (
          <p className="text-[10px] text-gray-500 text-center mt-1.5">
            {t('quota.hint', { n: quota.trialTokens ?? 0 })}
          </p>
        )}
        {quotaError && !quota?.unlimited && (
          <p className="text-[10px] text-amber-400 text-center mt-1.5">
            ⚡ {t('quota.exceeded')}
          </p>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-1.5">{t('chat.privacy')}</p>
      </form>

      {quotaOpen && <QuotaDetailsModal quota={quota} user={user} onClose={() => setQuotaOpen(false)} />}

      {scriptModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={scriptModalRef} role="dialog" aria-modal="true" data-testid="script-modal" className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t('chat.scriptModalTitle')}</h3>
              <button onClick={() => setScriptModalOpen(false)} aria-label={t('common.cancel', 'Отмена')} className="text-gray-400 hover:text-white min-w-[32px] min-h-[32px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('chat.scriptIdeaLabel')}</label>
                <textarea
                  value={scriptForm.idea}
                  onChange={(e) => setScriptForm(f => ({ ...f, idea: e.target.value }))}
                  rows={4}
                  placeholder={t('chat.scriptIdeaPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none resize-y"
                />
                <p className="text-[10px] text-gray-500 mt-1">{t('chat.scriptIdeaHint')}</p>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('chat.scriptPlatformLabel')}</label>
                <select value={scriptForm.platform} onChange={(e) => setScriptForm(f => ({ ...f, platform: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                  <option value="">{t('chat.scriptSelectPlaceholder')}</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram Reels</option>
                  <option value="vk">VK Клипы</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('chat.scriptViewsLabel')}</label>
                <select value={scriptForm.viewsRange} onChange={(e) => setScriptForm(f => ({ ...f, viewsRange: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                  <option value="">{t('chat.scriptSelectPlaceholder')}</option>
                  <option value="100–1000">100–1 000</option>
                  <option value="1–10 тыс.">1–10 тыс.</option>
                  <option value="10–100 тыс.">10–100 тыс.</option>
                  <option value="100 тыс.–1 млн">100 тыс.–1 млн</option>
                  <option value="1 млн+">1 млн+</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('chat.scriptNicheLabel')}</label>
                <input
                  value={scriptForm.niche}
                  onChange={(e) => setScriptForm(f => ({ ...f, niche: e.target.value }))}
                  placeholder={t('chat.scriptNichePlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={submitScriptFromIdea}
                disabled={scriptBusy || !scriptForm.idea.trim()}
                data-testid="script-generate-btn"
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100"
              >
                {scriptBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Clapperboard size={16} />}
                {t('chat.scriptGenerateBtn', { cost: actionPricing.scriptGenerationCost })}
              </button>
            </div>
          </div>
        </div>
      )}

      {coverPreview && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCoverPreview(null)}>
          <div ref={coverPreviewRef} role="dialog" aria-modal="true" data-testid="cover-preview-modal" className="bg-[#1a1a24] rounded-2xl border border-white/10 max-w-3xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t('chat.coverPreviewTitle', { w: coverPreview.width, h: coverPreview.height })}</h3>
              <button onClick={() => setCoverPreview(null)} aria-label={t('common.cancel', 'Отмена')} className="text-gray-400 hover:text-white min-w-[32px] min-h-[32px] flex items-center justify-center"><X size={18} /></button>
            </div>
            <img src={coverSrc(coverPreview.url)} alt="cover preview" className="w-full h-auto rounded-xl border border-white/10" />
          </div>
        </div>
      )}

      {showVoiceSettings && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t('voiceMode.settings')}</h3>
              <button onClick={() => setShowVoiceSettings(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('voiceMode.voice')}</label>
                <select value={settings.voiceId} onChange={(e) => setSettings(s => ({ ...s, voiceId: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                  <option value="ru-RU-female">Russian Female</option>
                  <option value="ru-RU-male">Russian Male</option>
                  <option value="en-US-female">English Female</option>
                  <option value="en-US-male">English Male</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('voiceMode.speed')}: {settings.speed.toFixed(1)}x</label>
                <input type="range" min={0.8} max={1.5} step={0.1} value={settings.speed} onChange={(e) => setSettings(s => ({ ...s, speed: Number(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('voiceMode.pitch')}</label>
                <select value={settings.pitch} onChange={(e) => setSettings(s => ({ ...s, pitch: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                  <option value="high">{t('voiceMode.high') || 'Высокий'}</option>
                  <option value="normal">{t('voiceMode.normal') || 'Нормальный'}</option>
                  <option value="low">{t('voiceMode.low') || 'Низкий'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">{t('voiceMode.accent')}</label>
                <select value={settings.accent} onChange={(e) => setSettings(s => ({ ...s, accent: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="zh">ZH</option>
                </select>
              </div>
              <button onClick={async () => {
                try { await voiceApi.saveSettings(settings); } catch (e) { console.error(e); }
                setShowVoiceSettings(false);
              }} className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
      {previewHtml && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewHtml(null)}>
          <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-4xl h-[80vh] flex flex-col p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{t('chat.platformPreview') || 'Platform Preview'}</h3>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {Object.keys(PLATFORM_STYLES).map(p => (
                <button key={p} onClick={() => setPreviewPlatform(p)} className={`px-3 py-1 rounded-lg text-xs capitalize ${previewPlatform === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-300'}`}>{p}</button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden rounded-xl bg-black/50 border border-white/10 flex items-center justify-center">
              <iframe
                title="platform-preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts"
                className={`h-full ${PLATFORM_STYLES[previewPlatform].bg}`}
                style={{ width: PLATFORM_STYLES[previewPlatform].width }}
              />
            </div>
          </div>
        </div>
      )}
      <OnboardingTour />
      {/* [CLIENT-JOURNEY-QA] исчерпание квоты → UpsellModal с живой ценой */}
      <UpsellModal
        open={!!upsell}
        onClose={() => setUpsell(null)}
        reason={upsell?.reason}
        limit={upsell?.limit}
        usage={upsell?.usage}
        upsellPlan={upsell?.upsellPlan}
        upsellPrice={upsell?.upsellPrice}
      />
    </div>
  );
}

export const OmegaChatContainer = OmegaChat;
