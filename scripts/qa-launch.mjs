#!/usr/bin/env node
// [CI-FOUNDATION] «Одна кнопка» QA: прогоняет ВСЕ qa-скрипты последовательно
// и выводит единую сводку: скрипт → ✅/❌ → время. Падение любого → exit 1.
// Запуск: backend на :18080 + frontend preview на :4173 + node scripts/qa-launch.mjs
// Порядок важен (сидеры раньше потребителей): createTestAccounts → qaPlanUsers/qaExhaustFree
// (пишут .tmp-ui-polish/qa-plans.json) → journey 1–4 → support (создаёт qa.owner) →
// referral (создаёт qa.referrer) → addons/security → остальные. Новые qa-*.mjs/qa*.js,
// не перечисленные в ORDER, подхватываются автоматически (в конец, по алфавиту).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ORDER = [
    'backend/scripts/createTestAccounts.js',
    'scripts/qa-journey-1-register.mjs',
    'backend/scripts/qaExhaustFree.js',
    'backend/scripts/qaPlanUsers.js',
    'scripts/qa-journey-2-free.mjs',
    'scripts/qa-journey-3-plans.mjs',
    'scripts/qa-journey-4-dialog.mjs',
    'backend/scripts/qaSupportFlow.js',
    'backend/scripts/qaReferralFlow.js',
    'backend/scripts/qaAddonsFlow.js',
    'backend/scripts/qaSecurityFlow.js',
    'backend/scripts/qaExtendFlow.js',
    'backend/scripts/qaRateLimitVpn.js',
    'backend/scripts/qaToken.js',
    'scripts/qa-view-as.mjs',
    'scripts/qa-role-switch-flash.mjs',
    'scripts/qa-staff-dop-e2e.mjs',
    'scripts/qa-onboarding-tour.mjs',
    'scripts/omega-honesty-test.mjs', // A+B всегда; LIVE-матрица — при OMEGA_HONESTY_LIVE=1
]

function discover() {
    const found = new Set()
    for (const f of fs.readdirSync(path.join(ROOT, 'scripts'))) {
        if (/^qa-.*\.mjs$/.test(f) && f !== 'qa-launch.mjs') found.add(`scripts/${f}`)
    }
    for (const f of fs.readdirSync(path.join(ROOT, 'backend', 'scripts'))) {
        if (/^qa.*\.js$/.test(f)) found.add(`backend/scripts/${f}`)
    }
    const known = new Set(ORDER)
    const extra = [...found].filter(f => !known.has(f)).sort()
    return [...ORDER.filter(f => fs.existsSync(path.join(ROOT, f))), ...extra]
}

const scripts = discover()
const only = process.argv[2] ? scripts.filter(s => s.includes(process.argv[2])) : scripts
const results = []
let failed = 0

console.log(`QA-LAUNCH: ${only.length} скриптов\n`)

for (const file of only) {
    const started = Date.now()
    process.stdout.write(`▶ ${file} ... `)
    let out = ''
    const code = await new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(ROOT, file)], {
            cwd: ROOT,
            env: {
                ...process.env,
                QA_BASE: process.env.QA_BASE || 'http://localhost:4173',
                UI_AUDIT_BASE: process.env.UI_AUDIT_BASE || 'http://localhost:4173',
                QA_API_URL: process.env.QA_API_URL || 'http://localhost:18080',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        child.stdout.on('data', d => { out += d })
        child.stderr.on('data', d => { out += d })
        child.on('close', resolve)
    })
    const secs = ((Date.now() - started) / 1000).toFixed(1)
    // скрипт считается упавшим, если exit≠0 ИЛИ в выводе есть ❌
    const bad = code !== 0 || out.includes('❌')
    if (bad) failed++
    const lastBad = bad ? (out.split('\n').filter(l => l.includes('❌')).slice(-2).join(' | ') || out.trim().split('\n').pop()).slice(0, 160) : ''
    results.push({ file, ok: !bad, secs, lastBad })
    console.log(`${bad ? '❌' : '✅'} ${secs}s${lastBad ? `\n   └ ${lastBad}` : ''}`)
    // при падении — хвост вывода скрипта (в CI нет другого способа увидеть детали)
    if (bad) {
        const tail = out.trim().split('\n').slice(-15).map(l => `   | ${l}`).join('\n')
        console.log(tail)
    }
}

console.log('\n═══ QA-LAUNCH СВОДКА ═══')
console.log('статус  время    скрипт')
for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'}     ${String(r.secs).padStart(6)}s  ${r.file}`)
}
console.log(`\nИТОГ: ${results.length - failed}/${results.length} зелёных${failed ? `, УПАЛО: ${failed}` : ''}`)
process.exit(failed ? 1 : 0)
