import { alertOwner } from './alertService.js';
import { startMemoryLogger, snapshotMemory } from '../utils/memoryLog.js';

let lastCheck = Date.now();
let isHealthy = true;

// [MEMORY-FIX] Пороги RAM (Render Free = 512MB): WARN 420 / FAIL 490.
// FAIL 498MB алертил при штатной работе у границы — спам каждые 15 мин.
const RAM_WARN_MB = 420;
const RAM_FAIL_MB = 490;
// Анти-спам: повторный FAIL-алерт не чаще 1 раза в 30 мин, и только при росте RSS.
const RAM_ALERT_COOLDOWN_MS = 30 * 60 * 1000;
let lastRamAlertAt = 0;
let lastRamAlertValue = 0;
let ramWarned = false;

export function startHealthMonitor() {
  // [MEMORY-FIX] периодический снапшот memoryUsage раз в 5 минут
  startMemoryLogger(5 * 60 * 1000);

  setInterval(async () => {
    const checks = [];

    // Проверка MongoDB
    const mongoose = (await import('mongoose')).default;
    checks.push({ name: 'MongoDB', ok: mongoose.connection.readyState === 1 });

    // Проверка ботов (процесс жив)
    checks.push({ name: 'OWNER-BOT', ok: true });
    checks.push({ name: 'OMEGA-BOT', ok: true });

    // Проверка памяти (Render Free 512MB)
    const memMB = snapshotMemory().rssMB;
    const ramFailed = memMB >= RAM_FAIL_MB;
    const ramWarn = !ramFailed && memMB >= RAM_WARN_MB;
    checks.push({ name: 'RAM', ok: !ramFailed, value: `${memMB}MB` });

    if (ramWarn && !ramWarned) {
      ramWarned = true;
      console.warn(`[HEALTH] RAM WARN: ${memMB}MB (порог ${RAM_WARN_MB}MB, FAIL на ${RAM_FAIL_MB}MB)`);
    } else if (!ramWarn && !ramFailed) {
      ramWarned = false;
    }

    const failed = checks.filter(c => !c.ok);

    if (failed.length > 0) {
      const now = Date.now();
      const ramOnly = failed.every(f => f.name === 'RAM');
      // [MEMORY-FIX] RAM-only FAIL: cooldown 30 мин; повтор раньше — только при росте RSS.
      // Не-RAM сбои (MongoDB и т.п.) алертят сразу, как раньше.
      if (ramOnly && lastRamAlertAt && now - lastRamAlertAt < RAM_ALERT_COOLDOWN_MS && memMB <= lastRamAlertValue) {
        lastCheck = now;
        return;
      }
      if (ramOnly) {
        lastRamAlertAt = now;
        lastRamAlertValue = memMB;
      }
      if (isHealthy || ramOnly) {
        isHealthy = false;
        const msg = failed.map(f => `🔴 ${f.name}: FAIL${f.value ? ` (${f.value})` : ''}`).join('\n');
        await alertOwner(`🚨 <b>ANTI-FAIL: Система нестабильна</b>\n${msg}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`);
      }
    } else if (!isHealthy) {
      isHealthy = true;
      lastRamAlertAt = 0;
      lastRamAlertValue = 0;
      await alertOwner(`🟢 <b>ANTI-FAIL: Система восстановлена</b>\nВсе проверки пройдены.\n⏰ ${new Date().toLocaleString('ru-RU')}`);
    }

    lastCheck = Date.now();
  }, 60 * 1000); // каждую минуту
}

export function getHealthStatus() {
  return { isHealthy, lastCheck: new Date(lastCheck).toISOString(), memory: snapshotMemory() };
}
