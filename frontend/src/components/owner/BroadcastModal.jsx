import { useState } from 'react';
import { X, Send, Sparkles, Loader2, Megaphone } from 'lucide-react';
import { API_BASE_URL } from '../../config.js';

const SEGMENTS = [
  { value: 'all', label: 'Все подписчики' },
  { value: 'active', label: 'Активные' },
  { value: 'past_due', label: 'Просроченные' },
  { value: 'canceled', label: 'Отменённые' },
  { value: 'refunded', label: 'Возвраты' },
  { value: 'pro', label: 'Тариф Pro' },
  { value: 'business', label: 'Тариф Business' },
  { value: 'agency', label: 'Тариф Agency' },
];

export default function BroadcastModal({ onClose }) {
  const [segment, setSegment] = useState('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const prompt = `Напиши короткое маркетинговое письмо на тему "${subject || 'акция для подписчиков'}" для сегмента "${SEGMENTS.find(s => s.value === segment)?.label}". ${discountCode ? `Добавь промокод ${discountCode}.` : ''} Тон: дружелюбный, без спама. Верни только текст письма.`;
      const res = await fetch(`${API_BASE_URL}/omega/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: prompt, mode: 'text' })
      });
      const data = await res.json().catch(() => ({}));
      const text = data.reply || data.text || data.message || '';
      setMessage(text || 'OMEGA не смогла сгенерировать текст. Попробуйте ещё раз.');
    } catch (err) {
      console.error('[BroadcastModal:generate]', err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ segment, subject, message, discountCode })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      setResult(data);
    } catch (err) {
      console.error('[BroadcastModal:send]', err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-luxury w-full max-w-lg rounded-2xl p-6 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors">
          <X size={20} />
        </button>

        <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Megaphone size={20} /> Массовая рассылка
        </h3>
        <p className="text-sm text-text-muted mb-4">Выберите сегмент и составьте сообщение</p>

        <div className="space-y-3 mb-4">
          <select
            value={segment}
            onChange={e => setSegment(e.target.value)}
            className="w-full glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none"
          >
            {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Тема письма"
            className="w-full glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none"
          />

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Текст сообщения..."
            rows={5}
            className="w-full glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none resize-none"
          />

          <input
            value={discountCode}
            onChange={e => setDiscountCode(e.target.value)}
            placeholder="Промокод (опционально)"
            className="w-full glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={aiLoading}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Сгенерировать через OMEGA
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Отправить
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
            ✅ Отправлено в очередь: {result.sent} получателей
          </div>
        )}
      </div>
    </div>
  );
}
