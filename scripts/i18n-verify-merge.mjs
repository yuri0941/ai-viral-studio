// проверка консолидации: сравнение flattened-ключей до (бэкап, 2 блока) и после
import fs from 'node:fs'

const flat = (o, p = '', s = new Set()) => {
    for (const [k, v] of Object.entries(o)) {
        const key = p ? `${p}.${k}` : k
        if (v && typeof v === 'object') flat(v, key, s)
        else s.add(key)
    }
    return s
}

function extractBlocks(raw, key) {
    const re = new RegExp('^  "' + key + '":\\s*\\{', 'gm')
    const objs = []
    let m
    while ((m = re.exec(raw))) {
        let i = m.index + m[0].length - 1, d = 0, j = i
        for (; j < raw.length; j++) {
            if (raw[j] === '"') { j++; while (j < raw.length && (raw[j] !== '"' || raw[j - 1] === '\\')) { if (raw[j] === '\\') j++; j++ } }
            if (raw[j] === '{') d++
            else if (raw[j] === '}') { d--; if (!d) { j++; break } }
        }
        objs.push(JSON.parse(raw.slice(i, j)))
    }
    return objs
}

function check(label, backupPath, currentPath, key) {
    const rawOld = fs.readFileSync(backupPath, 'utf8')
    const before = new Set()
    extractBlocks(rawOld, key).forEach(o => flat(o, key, before))
    const now = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
    const after = flat(now[key], key)
    const lost = [...before].filter(k => !after.has(k))
    console.log(`${label}: до ${before.size} → после ${after.size}, потеряно ${lost.length}`, lost.slice(0, 10))
}

check('settings (src/ru)', '.tmp-ui-polish/ru.json.bak', 'frontend/src/locales/ru.json', 'settings')
check('youtube (src/en)', '.tmp-ui-polish/en.json.bak', 'frontend/src/locales/en.json', 'youtube')
