#!/usr/bin/env node
// [UI-POLISH] Паритет i18n: все t('...')-ключи в коде × наличие в 4 файлах локалей.
// Запуск: node scripts/i18n-parity.mjs   (из корня репо)
// Выход: 0 — всё покрыто; 1 — есть пробелы (список в stdout).
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'frontend', 'src')
const LOCALES = [
    'frontend/src/locales/ru.json',
    'frontend/src/locales/en.json',
    'frontend/public/locales/ru.json',
    'frontend/public/locales/en.json',
]

// --- сбор ключей из кода ---
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'locales'])

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) yield* walk(full)
        else if (EXT.has(path.extname(entry.name)) && !/\.(bak|old|backup|backup_\d+|BACKUP)(\.|$)/i.test(entry.name)) yield full
    }
}

// t('key'), t("key"), i18n.t('key')
const STATIC_RE = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g
// t(`prefix.${var}`) / t(`prefix.${var}.suffix`) → префикс для префиксной проверки
const TEMPLATE_RE = /\bt\(\s*`([a-zA-Z0-9_.-]+)\.\$\{/g

const staticKeys = new Set()
const templatePrefixes = new Set()

for (const file of walk(SRC)) {
    const code = fs.readFileSync(file, 'utf8')
    for (const m of code.matchAll(STATIC_RE)) staticKeys.add(m[1])
    for (const m of code.matchAll(TEMPLATE_RE)) templatePrefixes.add(m[1])
}

// --- загрузка локалей ---
function flatten(obj, prefix = '', out = new Set()) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object') flatten(v, key, out)
        else out.add(key)
    }
    return out
}

const localeKeys = LOCALES.map(rel => {
    const full = path.join(ROOT, rel)
    const raw = fs.readFileSync(full)
    const hasBOM = raw[0] === 0xEF && raw[1] === 0xBB
    let json
    try {
        json = JSON.parse(raw.toString('utf8'))
    } catch (e) {
        console.error(`INVALID JSON: ${rel}: ${e.message}`)
        process.exit(2)
    }
    if (hasBOM) console.error(`BOM DETECTED: ${rel}`)
    return { rel, keys: flatten(json) }
})

// префикс шаблона покрыт, если в локали есть ключ, начинающийся с prefix.
const coversTemplate = (keySet, prefix) => {
    if (keySet.has(prefix)) return true
    const p = `${prefix}.`
    for (const k of keySet) if (k.startsWith(p)) return true
    return false
}

// --- отчёт ---
let problems = 0
for (const { rel, keys } of localeKeys) {
    const missing = [...staticKeys].filter(k => !keys.has(k)).sort()
    const missingTpl = [...templatePrefixes].filter(p => !coversTemplate(keys, p)).sort()
    if (missing.length || missingTpl.length) {
        problems += missing.length + missingTpl.length
        console.log(`\n== ${rel}: отсутствует ${missing.length} ключей, ${missingTpl.length} шаблонных префиксов`)
        missing.forEach(k => console.log(`  MISSING ${k}`))
        missingTpl.forEach(p => console.log(`  MISSING-TEMPLATE ${p}.*`))
    } else {
        console.log(`== ${rel}: OK`)
    }
}

// ru↔en и src↔public паритет по ИСПОЛЬЗУЕМЫМ ключам
const [srcRu, srcEn, pubRu, pubEn] = localeKeys.map(l => l.keys)
const used = new Set([...staticKeys])
const diff = (a, b, la, lb) => {
    const d = [...a].filter(k => used.has(k) && !b.has(k)).sort()
    if (d.length) {
        problems += d.length
        console.log(`\n== ${la} есть, ${lb} нет (используемые в коде): ${d.length}`)
        d.forEach(k => console.log(`  ${k}`))
    }
}
diff(srcRu, srcEn, 'src/ru', 'src/en')
diff(srcEn, srcRu, 'src/en', 'src/ru')
diff(srcRu, pubRu, 'src/ru', 'public/ru')
diff(srcEn, pubEn, 'src/en', 'public/en')

console.log(`\nИспользуемых статических ключей: ${staticKeys.size}, шаблонных префиксов: ${templatePrefixes.size}`)
console.log(problems === 0 ? 'I18N PARITY: OK (diff пустой)' : `I18N PARITY: ПРОБЕЛЫ — ${problems}`)
process.exit(problems === 0 ? 0 : 1)
