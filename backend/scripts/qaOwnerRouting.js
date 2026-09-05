// [BOTS-FIX] Прогон unit-теста owner-роутинга (превью-гейт, not-owner catch) в общей сводке qa-launch.
// Сервер не нужен: тест чисто юнитовый (backend/tests/owner-routing-unit.mjs).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'owner-routing-unit.mjs')
const r = spawnSync(process.execPath, [testFile], { stdio: 'inherit' })
process.exit(r.status ?? 1)
