import { useEffect, useState } from 'react';
import { request } from '../../../../services/api.js';

// [v9.9.19.6] Реальные изученные навыки OMEGA из MongoDB (SkillNode) — никаких моков
export function OmegaSkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await request('/omega/skill-nodes');
        if (alive) setSkills(res?.skills || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const totalApplied = skills.reduce((a, s) => a + (s.appliedCount || 0), 0);
  const maxApplied = Math.max(1, ...skills.map(s => s.appliedCount || 0));

  return (
    <div className="space-y-6 p-4 md:p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-xl">🧠</div>
        <div>
          <h2 className="text-2xl font-bold">OMEGA Skills</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {skills.length
              ? `Изучено навыков: ${skills.length} · Применений в постах и ответах: ${totalApplied}`
              : 'Что OMEGA реально изучила и применяет'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-6 rounded-xl text-sm text-[var(--text-muted)] animate-pulse">
          Загружаю навыки из базы…
        </div>
      )}

      {!loading && error && (
        <div className="glass-card p-6 rounded-xl text-sm text-[var(--text-muted)]">
          ⚠️ Не удалось загрузить навыки: {error}
        </div>
      )}

      {!loading && !error && skills.length === 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="font-bold mb-2 text-lg">🌱 Навыков пока нет</h3>
          <p className="text-sm text-[var(--text-muted)]">
            OMEGA начнёт обучение с первой команды. Напишите владельцу-боту: «изучи ведение канала» —
            и навык появится здесь с конспектом, датой и счётчиком применений.
            Ночью OMEGA также учится сама (Dream Mode, 02:00–06:00).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map(skill => (
          <div key={skill.id} className="glass-card p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="font-medium truncate">{skill.name}</span>
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {skill.learnedAt ? new Date(skill.learnedAt).toLocaleDateString('ru-RU') : ''}
              </span>
            </div>
            {skill.summary && (
              <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">{skill.summary}</p>
            )}
            {skill.facts?.length > 0 && (
              <ul className="text-xs space-y-1 mb-3">
                {skill.facts.map((f, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-[#8B5CF6]">•</span>
                    <span className="flex-1">{f}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-[var(--text-muted)]">Применений: <b className="text-[var(--text-primary)]">{skill.appliedCount || 0}</b></span>
              <span className="text-[var(--text-muted)]">{skill.factsCount} фактов · {skill.source === 'dream_mode' ? '🌙 ночная смена' : skill.source === 'web' ? '🌐 веб' : '🤖 AI'}</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8B5CF6] transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.round(((skill.appliedCount || 0) / maxApplied) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
