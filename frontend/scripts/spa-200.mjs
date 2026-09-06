// SPA-fallback для Cloudflare Pages: правило `/* /index.html 200` режется
// валидатором Pages ("Infinite loop detected", code 10021), поэтому fallback
// указывает на копию index.html под именем 200.html.
import { copyFileSync } from 'node:fs'

copyFileSync(new URL('../dist/index.html', import.meta.url), new URL('../dist/200.html', import.meta.url))
console.log('spa-200: dist/200.html создан')
