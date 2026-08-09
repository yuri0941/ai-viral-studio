import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { launchApi } from '../../services/api.js';

export default function BetaCounter() {
  const [slots, setSlots] = useState(50);

  useEffect(() => {
    launchApi.betaSlots()
      .then(r => setSlots(Math.max(0, r.data?.remaining || 50)))
      .catch(() => {});
  }, []);

  return (
    <div className="glass-luxury rounded-xl p-6 text-center space-y-3 my-8 max-w-md mx-auto border border-[var(--primary)]/20">
      <Rocket className="w-8 h-8 mx-auto text-purple-400" />
      <h3 className="text-xl font-bold">🚀 Бета-запуск</h3>
      <p className="text-[var(--text-muted)]">Открываем 50 слотов. Осталось:</p>
      <div className="text-5xl font-bold text-purple-400">{slots}</div>
      <p className="text-xs text-[var(--text-muted)]">Founding Members: -30% навсегда + золотой бейдж</p>
    </div>
  );
}
