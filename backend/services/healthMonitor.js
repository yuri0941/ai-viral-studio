import { alertOwner } from './alertService.js';

let lastCheck = Date.now();
let isHealthy = true;

export function startHealthMonitor() {
  setInterval(async () => {
    const checks = [];

    // Проверка MongoDB
    const mongoose = (await import('mongoose')).default;
    checks.push({ name: 'MongoDB', ok: mongoose.connection.readyState === 1 });

    // Проверка ботов (процесс жив)
    checks.push({ name: 'OWNER-BOT', ok: true });
    checks.push({ name: 'OMEGA-BOT', ok: true });

    // Проверка памяти (Render Free 512MB)
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    checks.push({ name: 'RAM', ok: memMB < 480, value: `${memMB}MB` });

    const failed = checks.filter(c => !c.ok);
    if (failed.length > 0 && isHealthy) {
      isHealthy = false;
      const msg = failed.map(f => `🔴 ${f.name}: FAIL${f.value ? ` (${f.value})` : ''}`).join('\n');
      await alertOwner(`🚨 <b>ANTI-FAIL: Система нестабильна</b>\n${msg}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`);
    } else if (failed.length === 0 && !isHealthy) {
      isHealthy = true;
      await alertOwner(`🟢 <b>ANTI-FAIL: Система восстановлена</b>\nВсе проверки пройдены.\n⏰ ${new Date().toLocaleString('ru-RU')}`);
    }

    lastCheck = Date.now();
  }, 60 * 1000); // каждую минуту
}

export function getHealthStatus() {
  return { isHealthy, lastCheck: new Date(lastCheck).toISOString() };
}
