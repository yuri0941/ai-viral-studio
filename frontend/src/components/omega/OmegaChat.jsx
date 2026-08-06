import React, { useState, useRef, useEffect } from "react";

export default function OmegaChat({ messages = [], onSend, isLoading }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* ШАПКА — ТОЛЬКО ЗДЕСЬ */}
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

      {/* СООБЩЕНИЯ — БЕЗ ДУБЛЕЙ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender === "user" ? "flex justify-end" : "flex flex-col items-start"}>
            {msg.sender === "ai" ? (
              <>
                <div className="group flex flex-col items-start max-w-[90%]">
                  <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm">
                    <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-gray-500">{msg.time}</span>
                      <button className="text-gray-500 hover:text-violet-400 text-xs" onClick={() => navigator.clipboard?.writeText(msg.text)}>📋</button>
                    </div>
                  </div>
                </div>
                {/* КНОПКИ ДЕЙСТВИЙ */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {["🪝 Сделать хук","📝 Сценарий","🎨 Обложка","📅 План"].map((l) => (
                    <button key={l} onClick={() => onSend(l)} className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all">{l}</button>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-2xl rounded-tr-none p-3.5 max-w-[85%]">
                <p className="text-sm text-white">{msg.text}</p>
                <p className="text-[10px] text-gray-500 text-right mt-1">{msg.time}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
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
      </div>
    </div>
  );
}


export const OmegaChatContainer = OmegaChat;

