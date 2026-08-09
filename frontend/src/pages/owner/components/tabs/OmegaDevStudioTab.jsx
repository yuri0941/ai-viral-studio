import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Code, Play, Save, GitBranch, AlertCircle } from 'lucide-react';

export default function OmegaDevStudioTab() {
  const { t } = useTranslation();
  const [spec, setSpec] = useState('');
  const [code, setCode] = useState('');
  const [codeId, setCodeId] = useState('');
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);

  const generateCode = async () => {
    setStatus('generating');
    setLogs(prev => [...prev, `⏳ OMEGA генерирует код...`]);
    try {
      const res = await fetch('/api/omega-supreme/devstudio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ spec, language: 'javascript' })
      });
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setCodeId(data.id);
        setStatus('reviewing');
        setLogs(prev => [...prev, `✅ Код сгенерирован (${data.code.length} символов)`]);
      } else {
        throw new Error(data.error || 'Не удалось сгенерировать');
      }
    } catch (e) {
      setLogs(prev => [...prev, `❌ Ошибка: ${e.message}`]);
      setStatus('idle');
    }
  };

  const approveAndDeploy = async () => {
    if (!codeId) return;
    setStatus('deploying');
    try {
      await fetch('/api/omega-supreme/devstudio/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id: codeId })
      });
      setLogs(prev => [...prev, `🚀 Код одобрен. Скопируйте его в проект через Kimi VS Code.`]);
      setStatus('deployed');
    } catch (e) {
      setLogs(prev => [...prev, `❌ ${e.message}`]);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Code className="w-6 h-6 text-purple-500" /> {t('devStudio.title') || 'OMEGA DevStudio'}
      </h2>
      <div className="glass-luxury rounded-xl p-4 space-y-4">
        <label className="block text-sm font-medium">Спецификация фичи</label>
        <textarea value={spec} onChange={e => setSpec(e.target.value)} rows={4}
          className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm"
          placeholder="Например: Добавить кнопку 'Экспорт PDF' в таблицу отчётов..." />
        <button onClick={generateCode} disabled={!spec || status === 'generating'}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium disabled:opacity-50">
          {status === 'generating' ? 'Генерация...' : 'Сгенерировать код'}
        </button>
      </div>

      {code && (
        <div className="glass-luxury rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2"><GitBranch className="w-4 h-4" /> Результат</span>
            <span className={`text-xs px-2 py-1 rounded-full ${status === 'reviewing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {status === 'reviewing' ? 'На проверке' : 'Одобрено'}
            </span>
          </div>
          <pre className="bg-[#0a0a1f] rounded-lg p-4 overflow-x-auto text-xs font-mono text-green-400 border border-[var(--border)]">
            {code}
          </pre>
          <div className="flex gap-3">
            <button onClick={approveAndDeploy} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm">
              <Play className="w-4 h-4 inline mr-1" /> Одобрить и применить
            </button>
            <button onClick={() => { setCode(''); setCodeId(''); setStatus('idle'); }} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 text-sm">
              Отклонить
            </button>
          </div>
        </div>
      )}

      <div className="glass-luxury rounded-xl p-4">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Логи</h3>
        <div className="space-y-1 text-xs font-mono text-[var(--text-muted)]">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
