import React, { useState, useRef, useEffect } from "react";
import { Mic, Send } from "lucide-react";
import { LuxuryMessageCard } from "./LuxuryMessageCard.jsx";
import OmegaLocalModeIndicator from "./OmegaLocalModeIndicator.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { omegaApi } from "../../services/api.js";

const ACTION_BUTTONS = [
  { id: 'hook', label: 'Сделать хук', icon: '🪝', prompt: 'Сгенерируй 5 цепляющих хуков для этого видео' },
  { id: 'script', label: 'Сценарий', icon: '📝', prompt: 'Напиши сценарий Reels/Shorts на основе этого анализа' },
  { id: 'cover', label: 'Обложка', icon: '🎨', prompt: 'Сгенерируй описание для AI-обложки к этому видео' },
  { id: 'plan', label: 'План', icon: '📅', prompt: 'Составь план публикации на неделю на основе этого анализа' }
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

function renderAiContent(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.includes('###')) {
    return (
      <div className="group flex flex-col items-start max-w-[95%] mx-auto">
        <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
          <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  const sections = text.split(/###\s*/).filter(Boolean);
  return (
    <div className="w-full max-w-[95%]">
      {sections.map((section, idx) => {
        const lines = section.split('\n').filter(Boolean);
        const title = lines[0] || 'Раздел';
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
  const [internalInput, setInternalInput] = useState("");
  const [internalMessages, setInternalMessages] = useState([]);
  const [internalIsTyping, setInternalIsTyping] = useState(false);
  const [internalQuotaError, setInternalQuotaError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState(null);

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

    // Optimistic UI — сообщение пользователя СРАЗУ
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
        text: '⚠️ Сервер временно недоступен. OMEGA переключает резервный канал... Повторите через 10 сек.',
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
      {/* Header — single, above messages */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-lg font-bold">AI</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]"></span>
          </div>
          <div>
            <div className="text-sm font-semibold">AI Viral Studio</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              OMEGA онлайн
            </div>
          </div>
        </div>
        <OmegaLocalModeIndicator />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={isUserMessage(msg) ? "flex justify-end" : "flex flex-col items-start"}>
            {isAiMessage(msg) ? (
              <>
                <div className="w-full max-w-[95%] mx-auto">{renderAiContent(msg.text)}</div>
                {/* Action buttons under every AI message */}
                <div className="flex flex-wrap gap-2 mt-3 max-w-[95%] mx-auto">
                  {ACTION_BUTTONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => send?.(action.prompt)}
                      type="button"
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all disabled:opacity-50"
                    >
                      {action.icon} {action.label}
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

      {/* Input */}
      <form onSubmit={handleSendMessage} className="fixed bottom-0 left-0 right-0 z-30 p-3 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите OMEGA..."
            disabled={loading}
            className="flex-1 h-12 bg-transparent text-base outline-none text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button
            onClick={startVoiceInput}
            type="button"
            disabled={loading}
            aria-label={isRecording ? 'Запись голоса' : 'Голосовой ввод'}
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
            aria-label="Отправить"
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {quotaError && (
          <p className="text-[10px] text-amber-400 text-center mt-1.5">
            ⚡ Лимит генераций исчерпан. Чтобы продолжить, перейдите на платный тариф.
          </p>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-1.5">Работаем через серверных провайдеров — ваши данные защищены</p>
      </form>
    </div>
  );
}

export const OmegaChatContainer = OmegaChat;
