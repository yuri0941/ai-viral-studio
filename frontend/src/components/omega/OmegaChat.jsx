import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Copy, Check, ChevronDown, ChevronUp, Brain, Volume2, VolumeX, Settings, AlertTriangle, Paperclip, MessageCircle, Send as TelegramIcon, Eye, X, FileUp } from "lucide-react";
import { LuxuryMessageCard } from "./LuxuryMessageCard.jsx";
import { YouTubeAnalysisCard } from "./YouTubeAnalysisCard.jsx";
import OmegaLocalModeIndicator from "./OmegaLocalModeIndicator.jsx";
import OnboardingTour from "../onboarding/OnboardingTour.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { omegaApi, voiceApi, request } from "../../services/api.js";
import { playSound } from "../../hooks/useSound.js";
import { useTTS } from "../../hooks/useTTS.js";
import toast from "react-hot-toast";
import { CLIENT_BOT_URL } from "../../config/bots.js";
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
function actionButtonsForRole(role) {
  return UNIQUE_ACTION_BUTTONS.filter(a => !a.roles || a.roles.includes(role));
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

function AiMessageContent({ text, t }) {
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
        <div className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{text.replace(htmlMatch[0], '')}</div>
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
                      {body}
                    </LuxuryMessageCard>
                  );
                })}
              </div>
            );
          }
          return part ? (
            <div key={i} className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{part}</p>
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
              {body}
            </LuxuryMessageCard>
          );
        })}
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-start max-w-[95%] mx-auto">
      <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
        <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function ReasoningSteps({ reasoning, t }) {
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
  embedded = false,
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [internalInput, setInternalInput] = useState("");
  const [internalMessages, setInternalMessages] = useState([]);
  const [internalIsTyping, setInternalIsTyping] = useState(false);
  const [internalQuotaError, setInternalQuotaError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [variantCount, setVariantCount] = useState(3);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState(() => localStorage.getItem('omega_recognition_lang') || 'ru');
  const [elevenlabsStatus, setElevenlabsStatus] = useState(null);
  const [quota, setQuota] = useState(null);
  const [supportMode, setSupportMode] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', screenshot: null });
  const [feedbackId, setFeedbackId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
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
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const runQuickAction = (action) => {
    if (action.action === 'support') {
      setSupportMode(true);
      return;
    }
    const prompt = action.prompt.replace('{n}', String(variantCount));
    setInput(prompt);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();

    const text = input.trim();
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast(t('chat.fileSoon'), { duration: 4000, icon: '📎' });
      return;
    }
    attachImageFile(file);
  };

  const attachImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => setAttachment({ name: file.name, type: file.type, base64: ev.target.result });
    reader.readAsDataURL(file);
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
    // Backend /api/upload принимает и видео, но чат пока не анализирует файлы — честно говорим об этом
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
      className={`relative flex flex-col bg-[#0a0a0f] text-white ${variant === 'fullscreen' ? 'h-[100dvh] md:h-[calc(100vh-80px)]' : 'h-full min-h-0'}`}
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
            <span data-tour="token-counter" className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              ⚡ {quota?.trialTokens ?? user?.trialTokens ?? 0} / 10
            </span>
            <OmegaLocalModeIndicator />
          </div>
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden omega-chat-scroll touch-pan-y scroll-smooth p-4 space-y-4"
        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((msg, i) => (
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
              <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-2xl rounded-tr-none p-3.5 max-w-[95%] mx-auto">
                <p className="text-sm text-white whitespace-pre-wrap">{msg.text}</p>
                {msg.time && <p className="text-[10px] text-gray-500 text-right mt-1">{msg.time}</p>}
              </div>
            )}
          </div>
        ))}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            data-tour="omega-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
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
        {isRecording && (
          <p className="text-[10px] text-rose-400 text-center mt-1.5 animate-pulse">
            {t('chat.listening')}
          </p>
        )}
        {quotaError && (
          <p className="text-[10px] text-amber-400 text-center mt-1.5">
            ⚡ {t('quota.exceeded')}
          </p>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-1.5">{t('chat.privacy')}</p>
      </form>

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
    </div>
  );
}

export const OmegaChatContainer = OmegaChat;
