// [UI-POLISH] Заливка переводов из .tmp-ui-polish/fill/*.json в src/locales + зеркалирование в public/locales.
// Запуск: node scripts/i18n-apply-fill.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILL_DIR = '.tmp-ui-polish/fill'
const fill = {}
for (const f of fs.readdirSync(FILL_DIR)) {
    if (!f.endsWith('.json')) continue
    Object.assign(fill, JSON.parse(fs.readFileSync(path.join(FILL_DIR, f), 'utf8')))
}

const missing = JSON.parse(fs.readFileSync('.tmp-ui-polish/missing-src-union.json', 'utf8'))
const uncovered = missing.filter(k => !fill[k]?.ru || !fill[k]?.en)
console.log(`fill.json: ${Object.keys(fill).length} ключей; непокрытых из списка: ${uncovered.length}`)
if (uncovered.length) {
    console.log(uncovered.join('\n'))
    process.exit(1)
}

const setDeep = (obj, key, value) => {
    const parts = key.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}
        cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
}

for (const lang of ['ru', 'en']) {
    const rel = `frontend/src/locales/${lang}.json`
    const json = JSON.parse(fs.readFileSync(rel, 'utf8'))
    let added = 0
    for (const [key, tr] of Object.entries(fill)) {
        const parts = key.split('.')
        let cur = json
        for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]]
        const leaf = parts[parts.length - 1]
        if (cur && typeof cur === 'object' && cur[leaf] !== undefined) continue // не затираем существующие
        setDeep(json, key, tr[lang])
        added++
    }
    fs.writeFileSync(rel, JSON.stringify(json, null, 2) + '\n', 'utf8')
    console.log(`${rel}: добавлено ${added} ключей`)
}

// public/locales — зеркало src (приложение читает только src; public — статическая копия для синхрона)
for (const lang of ['ru', 'en']) {
    fs.copyFileSync(`frontend/src/locales/${lang}.json`, `frontend/public/locales/${lang}.json`)
    console.log(`frontend/public/locales/${lang}.json ← зеркало src`)
}
console.log('DONE')
