import React, { useState, useRef, useEffect } from "react";
import { LuxuryMessageCard } from "./LuxuryMessageCard.jsx";

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
  if (lower.includes('cta') || lower.includes('призыв') || lower.includes('призыв')) return { icon: '🎯', color: 'amber' };
  if (lower.includes('аудитор') || lower.includes('целевая') || lower.includes('ца')) return { icon: '👥', color: 'emerald' };
  if (lower.includes('вирус') || lower.includes('тренд')) return { icon: '🔥', color: 'rose' };
  if (lower.includes('ошибк') || lower.includes('исправ')) return { icon: '⚠️', color: 'orange' };
  return { icon: 'ℹ️', color: 'gray' };
}

function renderAiContent(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.includes('###')) {
    return (
      <div className="group flex flex-col items-start max-w-[90%]">
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

export default function OmegaChat({ messages = [], onSend, isLoading }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header — single, above messages */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={msg.sender === "user" ? "flex justify-end" : "flex flex-col items-start"}>
            {msg.sender === "ai" ? (
              <>
                {renderAiContent(msg.text)}
                {/* Action buttons under every AI message */}
                <div className="flex flex-wrap gap-2 mt-3 max-w-[95%]">
                  {ACTION_BUTTONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => onSend(action.prompt)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all"
                    >
                      {action.icon} {action.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-2xl rounded-tr-none p-3.5 max-w-[85%]">
                <p className="text-sm text-white whitespace-pre-wrap">{msg.text}</p>
                {msg.time && <p className="text-[10px] text-gray-500 text-right mt-1">{msg.time}</p>}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Сообщение OMEGA..."
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-500"
          />
          <button onClick={handleSend} disabled={isLoading} className="text-violet-400 hover:text-violet-300 disabled:opacity-30">➤</button>
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-1.5">Работаем через серверных провайдеров — ваши данные защищены</p>
      </div>
    </div>
  );
}

export const OmegaChatContainer = OmegaChat;
