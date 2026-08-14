// [UI-POLISH] точный сканер битой кодировки: U+FFFD, Ð/Ñ (U+00D0/U+00D1), â€ и сербские кириллические буквы.
// Запуск: node scripts/mojibake-scan.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['frontend/src']
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.json'])
const SKIP = new Set(['node_modules', 'dist', '.git'])
const SKIP_FILE = /\.(bak|old|backup|backup_\d+|BACKUP)(\.|$)/i

// U+FFFD замена, U+00D0/U+00D1 (Ð/Ñ), 'â€', сербско-македонская кириллица U+0400–U+040F (в русском не встречается)
const BAD = /[�ÐÑ]|[Ѐ-Џ]/g

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) yield* walk(full)
        else if (EXT.has(path.extname(e.name)) && !SKIP_FILE.test(e.name)) yield full
    }
}

let hits = 0
for (const root of ROOTS) {
    for (const file of walk(root)) {
        const lines = fs.readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, i) => {
            if (BAD.test(line)) {
                BAD.lastIndex = 0
                hits++
                const isComment = /^\s*(\/\/|\*|\/\*)/.test(line)
                console.log(`${file}:${i + 1}${isComment ? ' [comment]' : ' [CODE]'} ${line.trim().slice(0, 110)}`)
            }
            BAD.lastIndex = 0
        })
    }
}
console.log(hits === 0 ? 'MOJIBAKE: чисто' : `MOJIBAKE: ${hits} строк`)
