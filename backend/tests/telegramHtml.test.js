// [v9.9.19.14] 4.5 — 9 тест-кейсов validateTelegramHTML
import { validateTelegramHTML, stripHtml } from '../utils/telegramHtml.js'

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) { passed++; console.log(`✅ ${name}`) }
  else { failed++; console.error(`❌ ${name}`) }
}

// 1. <a href="x">текст без </a> → тег закрыт
{
  const r = validateTelegramHTML('<a href="https://aiviral-studio.ru">текст без закрытия')
  check('1. unclosed <a> closed', r.fixed === '<a href="https://aiviral-studio.ru">текст без закрытия</a>')
}

// 2. & в тексте → &amp;
{
  const r = validateTelegramHTML('Соль & перец')
  check('2. & escaped', r.fixed === 'Соль &amp; перец')
}

// 3. <b><i>пересечение</b></i> → валидная вложенность
{
  const r = validateTelegramHTML('<b><i>пересечение</b></i>')
  const openB = r.fixed.indexOf('<b>')
  const closeB = r.fixed.indexOf('</b>')
  const openI = r.fixed.indexOf('<i>')
  const closeI = r.fixed.indexOf('</i>')
  check('3. crossing fixed', openB < openI && closeI < closeB && closeI > openI && !r.fixed.includes('</b></i>'))
}

// 4. <script> вырезан, текст остался
{
  const r = validateTelegramHTML('<script>alert(1)</script>Важный текст')
  check('4. <script> removed, text kept', !r.fixed.includes('<script') && r.fixed.includes('Важный текст'))
}

// 5. caption с эмодзи и ссылкой
{
  const r = validateTelegramHTML('🚀 Запуск! <a href="https://aiviral-studio.ru">aiviral-studio.ru</a> ✅')
  check('5. emoji + link caption', r.fixed.includes('🚀') && r.fixed.includes('<a href="https://aiviral-studio.ru">') && r.fixed.endsWith('</a> ✅'))
}

// 6. корректная вложенность — без изменений
{
  const src = '<b><i>всё правильно</i></b>'
  const r = validateTelegramHTML(src)
  check('6. valid nesting unchanged', r.fixed === src && r.ok)
}

// 7. пустая строка — не падает
{
  const r = validateTelegramHTML('')
  check('7. empty string safe', r.fixed === '' && r.ok)
}

// 8. текст без тегов — без изменений
{
  const src = 'Просто текст с цифрами 123 и знаком >'
  const r = validateTelegramHTML(src)
  check('8. plain text (lone > escaped)', r.fixed === 'Просто текст с цифрами 123 и знаком &gt;')
}

// 9. повторная валидация fixed-строки — ok
{
  const messy = '<a href="https://t.me/aiviralstudio">канал & <b>жирный'
  const once = validateTelegramHTML(messy)
  const twice = validateTelegramHTML(once.fixed)
  check('9. re-validation idempotent', twice.ok && twice.fixed === once.fixed)
}

console.log(`\n${passed}/9 PASS${failed ? `, ${failed} FAIL` : ''}`)
process.exit(failed ? 1 : 0)
