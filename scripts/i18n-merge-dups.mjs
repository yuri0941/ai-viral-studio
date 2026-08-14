// [UI-POLISH] Консолидация дублей top-level секций в локалях (settings, youtube).
// Правило: сохранить ВСЕ ключи (deep merge); при конфликте скалярных значений — осмысленный текст
// (с пробелом/кириллицей) побеждает ключ-заглушку; при равноценности — значение ПЕРВОГО блока.
// Перед записью проверяет отсутствие вложенных дублей в остальных секциях (иначе stringify потерял бы данные).
// Запуск: node scripts/i18n-merge-dups.mjs
import fs from 'node:fs'

const FILES = ['frontend/src/locales/ru.json', 'frontend/src/locales/en.json']

// --- потоковый сканер дублей на всех уровнях ---
function findAllDups(raw) {
    const dups = []
    const stack = [] // { keys:Set, path }
    let i = 0
    const n = raw.length
    const skipWs = () => { while (i < n && /\s/.test(raw[i])) i++ }
    const readString = () => {
        let s = ''
        i++ // opening quote
        while (i < n) {
            const c = raw[i]
            if (c === '\\') { s += raw[i + 1]; i += 2; continue }
            if (c === '"') { i++; break }
            s += c; i++
        }
        return s
    }
    const skipValue = () => {
        skipWs()
        const c = raw[i]
        if (c === '"') { readString(); return }
        if (c === '{' || c === '[') return // handled by main loop
        while (i < n && !/[,\}\]]/.test(raw[i])) i++
    }
    while (i < n) {
        skipWs()
        const c = raw[i]
        if (c === '{') {
            stack.push({ keys: new Set(), path: stack.length ? stack[stack.length - 1].path : '' })
            i++
        } else if (c === '}') {
            stack.pop(); i++
            skipWs()
            if (raw[i] === ',') i++
        } else if (c === '"') {
            const key = readString()
            skipWs()
            if (raw[i] === ':') {
                i++
                const frame = stack[stack.length - 1]
                const path = frame.path ? `${frame.path}.${key}` : key
                if (frame.keys.has(key)) dups.push(path)
                frame.keys.add(key)
                skipWs()
                if (raw[i] === '{') {
                    stack.push({ keys: new Set(), path })
                    i++
                } else if (raw[i] === '[') {
                    // массив: пропускаем целиком (дупы внутри массивов строк не критичны)
                    let depth = 0
                    do { if (raw[i] === '[') depth++; else if (raw[i] === ']') depth--; else if (raw[i] === '"') readString(); i++ } while (i < n && depth > 0)
                    skipWs(); if (raw[i] === ',') i++
                } else {
                    skipValue()
                    if (raw[i] === ',') i++
                }
            }
        } else i++
    }
    return dups
}

const looksLikeKey = (v) => typeof v === 'string' && /^[a-z][a-zA-Z0-9_.]*$/.test(v) && v.includes('.')
const meaningfulScore = (v) => {
    if (typeof v !== 'string') return 0
    let s = 0
    if (/[А-Яа-яЁё]/.test(v)) s += 2
    if (/\s/.test(v.trim())) s += 1
    if (looksLikeKey(v)) s -= 3
    return s
}

function deepMergePrefer(a, b) {
    // b вливается в a; скалярный конфликт — побеждает более осмысленный, иначе a (первый блок)
    const out = { ...a }
    for (const [k, v] of Object.entries(b)) {
        if (!(k in out)) { out[k] = v; continue }
        const cur = out[k]
        if (cur && v && typeof cur === 'object' && typeof v === 'object') out[k] = deepMergePrefer(cur, v)
        else if (meaningfulScore(v) > meaningfulScore(cur)) out[k] = v
    }
    return out
}

// извлечь top-level блоки с позициями (brace matching)
function topLevelBlocks(raw) {
    const blocks = [] // { key, start, end } — start/end охватывают '"key": {...}'
    const re = /^  "([^"]+)":\s*\{/gm
    let m
    while ((m = re.exec(raw))) {
        let i = m.index + m[0].length - 1, depth = 0, j = i
        for (; j < raw.length; j++) {
            if (raw[j] === '"') { j++; while (raw[j] !== '"' || raw[j - 1] === '\\') { if (raw[j] === '\\') j++; j++ } }
            if (raw[j] === '{') depth++
            else if (raw[j] === '}') { depth--; if (!depth) { j++; break } }
        }
        blocks.push({ key: m[1], start: m.index, end: j, objStart: i })
    }
    return blocks
}

for (const rel of FILES) {
    let raw = fs.readFileSync(rel, 'utf8')
    const allDups = findAllDups(raw)
    const topDups = allDups.filter(p => !p.includes('.'))
    const nestedDups = allDups.filter(p => p.includes('.'))
    console.log(`\n== ${rel}: top-level дубли [${topDups}], вложенные [${nestedDups.join(', ') || 'нет'}]`)

    if (!topDups.length) { console.log('   дублей нет, файл не тронут'); continue }
    if (nestedDups.length) {
        console.error('   СТОП: вложенные дубли требуют ручного разбора, файл НЕ изменён')
        process.exitCode = 1
        continue
    }

    const blocks = topLevelBlocks(raw)
    const groups = {}
    blocks.forEach(b => { (groups[b.key] = groups[b.key] || []).push(b) })

    // собираем merged-объекты для дублированных ключей
    const mergedByKey = {}
    for (const key of topDups) {
        const parts = groups[key].map(b => JSON.parse(raw.slice(b.objStart, b.end)))
        const merged = parts.reduce((acc, part) => deepMergePrefer(acc, part), {})
        mergedByKey[key] = merged
        console.log(`   ${key}: блоков ${parts.length}, ключей ${parts.map(p => Object.keys(p).length).join(' + ')} → ${Object.keys(merged).length}`)
    }

    // пересобираем файл: первый блок заменяем merged, остальные блоки дубля вырезаем
    let result = ''
    let cursor = 0
    const sorted = [...blocks].sort((a, b) => a.start - b.start)
    for (const b of sorted) {
        if (!topDups.includes(b.key)) continue
        result += raw.slice(cursor, b.start)
        const isFirst = groups[b.key][0] === b
        if (isFirst) {
            const body = JSON.stringify(mergedByKey[b.key], null, 2).split('\n').map((l, idx) => idx === 0 ? l : '  ' + l).join('\n')
            result += `  "${b.key}": ${body}`
        }
        cursor = b.end
        // вырезаем trailing comma удаляемого блока или ведущую запятую — нормализуем ниже
        if (!isFirst) {
            // пропустить следующую за блоком запятую, если она есть в raw после end
        }
    }
    result += raw.slice(cursor)

    // нормализация запятых после вырезки: ',,' → ',', ',\n}' → '\n}', '{\n,' → '{'
    result = result
        .replace(/,[ \t]*\r?\n([ \t]*)\r?\n/g, ',\n$1')   // пустая строка после запятой
        .replace(/,(\s*[}\]])/g, '$1')                    // висячая запятая
        .replace(/,\s*,/g, ',')                           // двойная запятая

    JSON.parse(result) // валидация — упадёт при ошибке
    fs.writeFileSync(rel, result, 'utf8')
    console.log('   записано, JSON валиден')
}
