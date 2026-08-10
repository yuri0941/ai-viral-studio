import { useState } from 'react';

export function OmegaSkillsTab() {
  const [skills] = useState([
    { name: 'SMM Content', level: 85, max: 100, color: '#F59E0B', desc: 'Посты, хуки, вирусность' },
    { name: 'Telegram Growth', level: 72, max: 100, color: '#8B5CF6', desc: 'Каналы, боты, вовлечение' },
    { name: 'AI Prompting', level: 91, max: 100, color: '#00ff41', desc: 'Генерация, анализ, оптимизация' },
    { name: 'Client Sales', level: 68, max: 100, color: '#06B6D4', desc: 'Drip campaigns, CTA, churn guard' },
    { name: 'Video Creation', level: 45, max: 100, color: '#EF4444', desc: 'Shorts, Reels, TikTok' },
    { name: 'Predictive Analytics', level: 78, max: 100, color: '#EC4899', desc: 'Прогнозы, тренды, LTV' },
    { name: 'Neural Graph', level: 60, max: 100, color: '#F97316', desc: 'Связи, кластеры, инсайты' },
    { name: 'Voice AI', level: 30, max: 100, color: '#6366F1', desc: 'Whisper STT, ElevenLabs TTS' }
  ]);

  const [learning] = useState([
    { name: 'DeepSeek reasoning patterns', progress: 34, eta: '2 часа', color: '#00ff41' },
    { name: 'TikTok algorithm 2026', progress: 67, eta: '45 мин', color: '#F59E0B' },
    { name: 'Russian 422-FZ ad marking', progress: 89, eta: '10 мин', color: '#8B5CF6' }
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-xl">🧠</div>
        <div>
          <h2 className="text-2xl font-bold">OMEGA Skills</h2>
          <p className="text-sm text-[var(--text-muted)]">Что OMEGA уже знает и изучает прямо сейчас</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map(skill => (
          <div key={skill.name} className="glass-card p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{skill.name}</span>
              <span className="text-sm font-bold" style={{ color: skill.color }}>{skill.level}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${skill.level}%`, backgroundColor: skill.color }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">{skill.desc}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 rounded-xl mt-6">
        <h3 className="font-bold mb-4 text-lg">📚 Что OMEGA изучает сейчас</h3>
        <div className="space-y-3">
          {learning.map(item => (
            <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: item.color }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.progress}%`, backgroundColor: item.color }} />
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">ETA: {item.eta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
