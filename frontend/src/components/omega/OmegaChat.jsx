import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Copy, Check } from "lucide-react";
import { LuxuryMessageCard } from "./LuxuryMessageCard.jsx";
import OmegaLocalModeIndicator from "./OmegaLocalModeIndicator.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { omegaApi } from "../../services/api.js";

const ACTION_BUTTONS = [
  { id: 'hook', label: 'chat.action.hook', icon: '🪝', prompt: 'Сгенерируй 5 цепляющих хуков для вирусного контента' },
  { id: 'script', label: 'chat.action.script', icon: '📝', prompt: 'Напиши сценарий Reels/Shorts для AI Viral Studio' },
  { id: 'code', label: 'chat.action.code', icon: '💻', prompt: 'Сгенерируй production-ready React/Node.js код для AI Viral Studio. Стек: React 18, Vite, Tailwind, Node.js, Express, MongoDB. Не используй mock.' },
  { id: 'site', label: 'chat.action.site', icon: '🌐', prompt: 'Создай landing page для AI Viral Studio: HTML, CSS, структура, тексты, CTA. Верни полный HTML файл.' },
  { id: 'ad-variants', label: 'chat.action.adVariants', icon: '📢', prompt: 'Сгенерируй {n} варианта рекламного креатива для AI Viral Studio: заголовок, текст, CTA, целевая аудитория, прогноз CTR и engagement. Верни результат в виде markdown-таблицы.' },
  { id: 'niche', label: 'chat.action.niche', icon: '🔍', prompt: 'Проанализируй нишу AI-инструментов для вирусного контента: тренды, конкуренты, аудитория, возможности.' }
];

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

function CodeBlock({ code }) {
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
        aria-label={copied ? 'Скопировано' : 'Копировать'}
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
            return <CodeBlock key={i} code={code} />;
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

function isUserMessage(msg) {
  return msg.role === 'user' || msg.sender === 'user';
}

function isAiMessage(msg) {
  return msg.role === 'omega' || msg.role === 'ai' || msg.sender === 'ai' || msg.sender === 'omega';
}

export default function OmegaChat({
  messages: externalMessages = [],
  onSend,
  sendMessage,
  isLoading,
  isTyping: externalTyping,
  input: externalInput,
  setInput: externalSetInput,
  quotaError: externalQuotaError,
  userRole: externalUserRole,
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

    try {
      console.log('[CHAT] Sending:', text.substring(0, 50));
      const res = await omegaApi.chat(text, messages.slice(-10), 'ru', userRole, user?._id || null);
      console.log('[CHAT] Received:', res);

      const aiMsg = {
        role: 'omega',
        text: res?.data?.response || res?.text || res?.message || '...',
        provider: res?.provider || res?.data?.provider,
        timestamp: Date.now(),
        id: `a-${Date.now()}`,
      };
      setInternalMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[CHAT] Error:', err);
      setInternalMessages(prev => [...prev, {
        role: 'omega',
        text: t('chat.serverUnavailable'),
        isError: true,
        timestamp: Date.now(),
        id: `err-${Date.now()}`,
      }]);
    } finally {
      setInternalIsTyping(false);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Voice input not supported in this browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-lg font-bold">AI</div>
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
        <OmegaLocalModeIndicator />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={isUserMessage(msg) ? "flex justify-end" : "flex flex-col items-start"}>
            {isAiMessage(msg) ? (
              <>
                <AiMessageContent text={msg.text} t={t} />
                <div className="flex flex-wrap gap-2 mt-3 max-w-[95%] mx-auto">
                  {ACTION_BUTTONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => runQuickAction(action)}
                      type="button"
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all disabled:opacity-50"
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
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="fixed bottom-0 left-0 right-0 z-30 p-3 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
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
        <div className="flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            disabled={loading}
            className="flex-1 h-12 bg-transparent text-base outline-none text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button
            onClick={startVoiceInput}
            type="button"
            disabled={loading}
            aria-label={isRecording ? t('chat.recording') : t('chat.mic')}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              isRecording
                ? 'text-rose-500 animate-pulse'
                : 'text-gray-400 hover:text-violet-300 hover:bg-white/[0.06]'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() && !attachment || loading}
            aria-label={t('chat.send')}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {quotaError && (
          <p className="text-[10px] text-amber-400 text-center mt-1.5">
            ⚡ {t('quota.exceeded')}
          </p>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-1.5">{t('chat.privacy')}</p>
      </form>
    </div>
  );
}

export const OmegaChatContainer = OmegaChat;
