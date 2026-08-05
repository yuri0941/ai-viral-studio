import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

// [v5.7-COMPACT] added: Super Chat floating widget
export default function SuperChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, from: 'system', text: 'Привет! Здесь можно задать вопрос команде AI Viral Studio.' }
    ]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = { id: Date.now(), from: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now() + 1, from: 'system', text: 'Спасибо! Мы получили ваше сообщение и скоро ответим.' }]);
        }, 600);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {open && (
                <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0f0f24] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#16162e]">
                        <h3 className="text-sm font-semibold text-white">Super Chat</h3>
                        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[360px]">
                        {messages.map(m => (
                            <div key={m.id} className={`text-sm ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                                <span className={`inline-block px-3 py-2 rounded-xl ${m.from === 'user' ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-200'}`}>
                                    {m.text}
                                </span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    <div className="p-3 border-t border-white/10 bg-[#16162e] flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Напишите сообщение..."
                            className="flex-1 bg-black/20 text-white text-sm rounded-xl px-3 py-2 outline-none border border-white/10 focus:border-violet-500"
                        />
                        <button onClick={handleSend} className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white">
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                aria-label="Открыть Super Chat"
            >
                {open ? <X size={22} /> : <MessageCircle size={22} />}
            </button>
        </div>
    );
}
