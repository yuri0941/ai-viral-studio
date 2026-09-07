// [CHAT-PRO-REWORK З4] Дизайн-гейт «Люкс-хаба» 1:1 по утверждённому эталону (выбор владельца qid 4c57e59643ed):
//  НА экране: люкс-шапка (пилюля ✦, поиск, меню), чистая лента, справа кольцо баланса + «В этом месяце».
//  НЕТ на экране: панелей «Сессии»/«Режимы»/«Инсайты» (они — в шторке по кнопке-меню, Esc закрывает).
//  Плюс З3: черновик переживает reload, поиск с empty-state, house-ads ≤34px (спека Р3), без h-scroll,
//  светлая тема = белые карточки (эталон). Роли: business (клиент) полный прогон, admin/creator — сверка.
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/chat-pro-luxe-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/chat-pro-luxe')
fs.mkdirSync(OUT, { recursive: true })

const ACCOUNTS = {
  client: { email: 'client.test@aiviral-studio.ru', password: 'TestClient123!' },     // business
  admin: { email: 'admin.test@aiviral-studio.ru', password: 'TestAdmin123!' },
  creator: { email: 'creator.test@aiviral-studio.ru', password: 'TestCreator123!' },
  owner: { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' },        // [CHAT-PRO-FIX З2] безлимит
}

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function proxyApi(context) {
  await context.route(`${API_ORIGIN}/**`, async (route) => {
    const req = route.request()
    const url = req.url().replace(API_ORIGIN, LOCAL_API)
    try {
      const headers = { ...req.headers() }
      delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
      const body = await resp.body()
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

async function loginToken(acc) {
  const resp = await fetch(`${LOCAL_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[acc]),
  })
  const data = await resp.json()
  return data?.data?.token || data?.token || null
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

async function withPage(browser, { token, theme = 'dark', lang = 'ru', vw = 1280, vh = 900, seedHistory = false }, fn) {
  // тема из префов юзера в БД сильнее localStorage (DashboardShell sync) — ставим через API, мерджим с текущими
  if (token) {
    const me = await fetch(`${LOCAL_API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null)
    const prefs = { ...(me?.data?.preferences || me?.preferences || {}), theme }
    await fetch(`${LOCAL_API}/api/users/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferences: prefs }),
    }).catch(() => {})
  }
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: lang === 'en' ? 'en-US' : 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  await page.addInitScript(([tk, th, lg, seed]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', lg)
    localStorage.setItem('i18n-lang', lg)
    localStorage.setItem('app_language', lg)
    localStorage.setItem('cookie_consent', 'accepted')
    // [З5] длинная лента: сидим 45 сообщений в историю (omega_chat_history)
    if (seed) {
      const msgs = []
      for (let i = 1; i <= 45; i++) {
        msgs.push({ id: `u${i}`, role: 'user', text: `Тестовый вопрос ${i}: придумай хук про нейросети и контент`, timestamp: new Date(Date.now() - (46 - i) * 60000).toISOString() })
        msgs.push({ id: `a${i}`, role: 'omega', text: `Ответ ${i}. Вот разбор темы:\n\n1. Первый тезис ответа номер ${i} с пояснением и деталями.\n2. Второй тезис — чуть длиннее, чтобы сообщение занимало несколько строк ленты.\n3. Третий тезис завершает блок.`, timestamp: new Date(Date.now() - (46 - i) * 60000 + 5000).toISOString() })
      }
      localStorage.setItem('omega_chat_history', JSON.stringify(msgs))
    }
  }, [token, theme, lang, seedHistory])
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

async function gotoChat(page, mode = 'chat') {
  await page.goto(`${BASE}/creative-hub/${mode}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(4000)
  for (let i = 0; i < 10; i++) {
    const nextBtn = page.locator('.driver-popover-next-btn')
    if (!(await nextBtn.isVisible().catch(() => false))) break
    await nextBtn.click(); await page.waitForTimeout(400)
  }
}

const noHScroll = async (page) => !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1))

// эталон: панелей НЕТ на экране
async function checkNoPanels(page, tag) {
  check(`${tag}: панель «Сессии» НЕ на экране`, !(await page.locator('h3:text-is("Сессии")').first().isVisible().catch(() => false)))
  check(`${tag}: панель «Режимы» НЕ на экране`, !(await page.locator('h3:text-is("Режимы")').first().isVisible().catch(() => false)))
  check(`${tag}: панель «Инсайты» НЕ на экране`, !(await page.locator('h3:text-is("Инсайты")').first().isVisible().catch(() => false)))
}

const browser = await chromium.launch()
try {
  const tokens = {}
  for (const acc of Object.keys(ACCOUNTS)) {
    tokens[acc] = await loginToken(acc)
    check(`логин ${acc} (qa)`, !!tokens[acc])
  }

  // ── Клиент: полный прогон (dark) ──
  await withPage(browser, { token: tokens.client }, async (page) => {
    await gotoChat(page)
    check('люкс-шапка: OMEGA Studio', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('люкс-шапка: «люкс-режим»', await page.locator('text=люкс-режим').first().isVisible().catch(() => false))
    await checkNoPanels(page, '1280 dark')

    // кольцо баланса + «В этом месяце» — видны с 821px (эталон: одна правая колонка)
    check('1280: кольцо баланса видно', await page.locator('text=Баланс генераций').first().isVisible().catch(() => false))
    check('1280: «В этом месяце» видно', await page.locator('text=В этом месяце').first().isVisible().catch(() => false))
    check('1280: «Постов» в статистике', await page.locator('text=Постов').first().isVisible().catch(() => false))

    // пилюля → модалка → Esc (WCAG)
    const pill = page.locator('[data-tour="token-counter"]').first()
    check('пилюля квоты видна', await pill.isVisible().catch(() => false))
    await pill.click().catch(() => {})
    await page.waitForTimeout(600)
    check('пилюля → модалка «Баланс генераций»', await page.locator('[role="dialog"]').first().isVisible().catch(() => false))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check('Esc закрывает модалку', !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)))

    // шторка: меню → Сессии/Режимы/Инсайты доступны → Esc закрывает (инвентарь З2)
    await page.locator('button[aria-label="Меню чата"]').first().click()
    await page.waitForTimeout(600)
    check('шторка: открылась (dialog)', await page.locator('[role="dialog"]').first().isVisible().catch(() => false))
    check('шторка: «Сессии» внутри', await page.locator('[role="dialog"] h3:text-is("Сессии")').isVisible().catch(() => false))
    check('шторка: «Режимы» внутри', await page.locator('[role="dialog"] h3:text-is("Режимы")').isVisible().catch(() => false))
    check('шторка: «Инсайты» внутри', await page.locator('[role="dialog"] h3:text-is("Инсайты")').isVisible().catch(() => false))
    // [З4] шторка СЛЕВА, solid (непрозрачная), ≤360px
    const drawer = await page.evaluate(() => {
      const el = document.querySelector('.chat-pro-drawer')
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { x: Math.round(r.x), w: Math.round(r.width), bg: cs.backgroundColor, backdrop: cs.backdropFilter }
    })
    check('шторка: слева (x=0)', !!drawer && drawer.x <= 1, JSON.stringify(drawer))
    check('шторка: ширина ≤360px', !!drawer && drawer.w <= 360, `w=${drawer?.w}`)
    check('шторка: solid тёмная (rgb(15,15,24))', drawer?.bg === 'rgb(15, 15, 24)', drawer?.bg)
    check('шторка: без блюра-просвета', !drawer || drawer.backdrop === 'none', drawer?.backdrop)
    await shot(page, 'luxehub-drawer-1280-dark')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check('шторка: Esc закрывает', !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)))

    // поиск: фильтр + empty-state
    const search = page.locator('input[type="search"]').first()
    check('поле поиска видно (sm+)', await search.isVisible().catch(() => false))
    await search.fill('zzzнеттакогоzzz')
    await page.waitForTimeout(500)
    check('поиск: empty-state «Ничего не найдено»', await page.locator('text=Ничего не найдено').isVisible().catch(() => false))
    await search.fill('')
    await page.waitForTimeout(400)

    // черновик: набрать → reload → текст на месте
    const input = page.locator('[data-tour="omega-input"]')
    await input.fill('черновик-проба-123')
    await page.waitForTimeout(400)
    await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    check('черновик переживает reload', (await page.locator('[data-tour="omega-input"]').inputValue().catch(() => '')) === 'черновик-проба-123')
    await page.locator('[data-tour="omega-input"]').fill('')

    // house-ads баннер ≤34px (спека Р3) — у клиента виден
    const h = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div,aside')].find(e => e.textContent.includes('Реклама') && e.getBoundingClientRect().height < 60 && e.getBoundingClientRect().height > 10)
      return el ? el.getBoundingClientRect().height : 0
    })
    if (h > 0) check('house-ads баннер ≤34px', h <= 34.5, `h=${h}px`)
    else console.log('ℹ️ house-ads баннер скрыт («Скрыть на день»/ротация) — высоту не меряем')

    check('1280 dark: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-dark')
  })

  // ── Клиент: светлая тема (эталон шага 0) ──
  await withPage(browser, { token: tokens.client, theme: 'light' }, async (page) => {
    await gotoChat(page)
    const pageBg = await page.evaluate(() => getComputedStyle(document.querySelector('.chat-pro-page') || document.body).backgroundColor)
    check('light: фон страницы светлый', pageBg === 'rgb(245, 245, 247)', pageBg)
    const feedBg = await page.evaluate(() => {
      const el = document.querySelector('.chat-pro-embed')
      return el ? getComputedStyle(el).backgroundColor : ''
    })
    check('light: лента — белая карточка', feedBg === 'rgb(255, 255, 255)', feedBg)
    await checkNoPanels(page, '1280 light')
    check('1280 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-light')
  })

  // ── EN (i18n) ──
  await withPage(browser, { token: tokens.client, lang: 'en' }, async (page) => {
    await gotoChat(page)
    check('EN: «luxe mode» в шапке', await page.locator('text=luxe mode').first().isVisible().catch(() => false))
    await shot(page, 'luxehub-1280-dark-en')
  })

  // ── 360 (iPhone-first по гейту) и 768 ──
  await withPage(browser, { token: tokens.client, vw: 360, vh: 800 }, async (page) => {
    await gotoChat(page)
    check('360: люкс-шапка видна', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('360: пилюля квоты видна', await page.locator('[data-tour="token-counter"]').first().isVisible().catch(() => false))
    // одна колонка <821px: кольцо скрыто с экрана (эталон), баланс доступен через пилюлю.
    // Не через aside: левый шелл-навигатор на мобиле — тоже <aside> (translate-x-full, isVisible его не ловит).
    check('360: правая колонка скрыта (1 колонка)', !(await page.locator('text=Баланс генераций').first().isVisible().catch(() => false)))
    const searchBtn = page.locator('button[aria-label*="Поиск"]').first()
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click()
      await page.waitForTimeout(400)
      check('360: поиск раскрывается кнопкой', await page.locator('input[type="search"]:visible').first().isVisible().catch(() => false))
      await searchBtn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
    await checkNoPanels(page, '360 dark')
    check('360: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-360-dark')
  })

  await withPage(browser, { token: tokens.client, vw: 360, vh: 800, theme: 'light' }, async (page) => {
    await gotoChat(page)
    check('360 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-360-light')
  })

  await withPage(browser, { token: tokens.client, vw: 768, vh: 900 }, async (page) => {
    await gotoChat(page)
    await checkNoPanels(page, '768 dark')
    check('768: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-768-dark')
  })

  await withPage(browser, { token: tokens.client, vw: 768, vh: 900, theme: 'light' }, async (page) => {
    await gotoChat(page)
    check('768 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-768-light')
  })

  // ── 3 роли: сверка компоновки 1280 dark/light ──
  for (const acc of ['admin', 'creator']) {
    for (const theme of ['dark', 'light']) {
      await withPage(browser, { token: tokens[acc], theme }, async (page) => {
        await gotoChat(page)
        check(`${acc} ${theme}: люкс-шапка`, await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
        await checkNoPanels(page, `${acc} ${theme}`)
        // у admin/creator есть режимы → переключатель в шапке (md+)
        check(`${acc} ${theme}: переключатель режимов в шапке`, await page.locator('[role="tablist"]').first().isVisible().catch(() => false))
        check(`${acc} ${theme}: без горизонтального скролла`, await noHScroll(page))
        await shot(page, `luxehub-1280-${theme}-${acc}`)
      })
    }
  }

  // ── [CHAT-PRO-FIX З1] Режимы analyzer/viral — НОВАЯ компоновка (без панелей), меняются шапка/плейсхолдер ──
  const MODE_LABEL = { analyzer: 'Content Analyzer', viral: 'Viral Studio' }
  const MODE_PH = { analyzer: 'Анализ контента', viral: 'Генерация хуков' }
  for (const m of ['analyzer', 'viral']) {
    for (const theme of ['dark', 'light']) {
      for (const vw of [360, 768, 1280]) {
        await withPage(browser, { token: tokens.client, theme, vw, vh: vw === 360 ? 800 : 900 }, async (page) => {
          await gotoChat(page, m)
          const tag = `${m} ${vw} ${theme}`
          check(`${tag}: люкс-шапка`, await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
          await checkNoPanels(page, tag)
          if (vw >= 768) {
            check(`${tag}: режим в шапке («${MODE_LABEL[m]}»)`, await page.locator(`text=${MODE_LABEL[m]}`).first().isVisible().catch(() => false))
            const ph = await page.locator('[data-tour="omega-input"]').getAttribute('placeholder').catch(() => '')
            check(`${tag}: плейсхолдер режима`, (ph || '').includes(MODE_PH[m]), ph || '')
          }
          check(`${tag}: без горизонтального скролла`, await noHScroll(page))
          await shot(page, `luxehub-mode-${m}-${vw}-${theme}`)
        })
      }
    }
  }

  // ── [CHAT-PRO-FIX З2] Владелец = безлимит: ∞, без плашки лимита ──
  await withPage(browser, { token: tokens.owner }, async (page) => {
    await gotoChat(page)
    check('owner: люкс-шапка', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    const pillText = await page.locator('[data-tour="token-counter"]').first().textContent().catch(() => '')
    check('owner: пилюля показывает ∞', (pillText || '').includes('∞'), (pillText || '').trim())
    check('owner: НЕТ «0✦ из 10» (кольцо без «из 10»)', !(await page.locator('text=из 10').first().isVisible().catch(() => false)))
    check('owner: «Безлимит» в карточке кольца', await page.locator('text=Безлимит').first().isVisible().catch(() => false))
    check('owner: НЕТ плашки «Лимит генераций исчерпан»', !(await page.locator('text=Лимит генераций исчерпан').first().isVisible().catch(() => false)))
    await shot(page, 'luxehub-owner-unlimited-1280-dark')
  })

  // ── [CHAT-PRO-FIX З5] Скролл длинной ленты: шапка на месте, ↓ к последнему, догрузка без прыжка ──
  for (const [vw, vh, theme] of [[1280, 900, 'dark'], [1280, 900, 'light'], [768, 900, 'dark'], [768, 900, 'light'], [360, 800, 'dark'], [360, 800, 'light']]) {
    await withPage(browser, { token: tokens.client, theme, vw, vh, seedHistory: true }, async (page) => {
      await gotoChat(page)
      const tag = `З5 ${vw} ${theme}`
      const metrics = await page.evaluate(() => {
        const el = document.querySelector('.omega-chat-scroll')
        return el ? { sh: el.scrollHeight, ch: el.clientHeight, st: el.scrollTop } : null
      })
      check(`${tag}: лента скроллится (история 90 сообщ.)`, !!metrics && metrics.sh > metrics.ch * 1.5, JSON.stringify(metrics))
      check(`${tag}: страница НЕ скроллится (docH≈vh)`, !(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2)))
      // в середину ленты
      await page.evaluate(() => { const el = document.querySelector('.omega-chat-scroll'); el.scrollTop = el.scrollHeight / 2 })
      await page.waitForTimeout(500)
      check(`${tag}: шапка видна при скролле ленты в середине`, await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
      check(`${tag}: пилюля ✦ видна при скролле`, await page.locator('[data-tour="token-counter"]').first().isVisible().catch(() => false))
      check(`${tag}: композер виден при скролле`, await page.locator('[data-tour="omega-input"]').isVisible().catch(() => false))
      // ↓ к последнему
      const downBtn = page.locator('[data-tour="scroll-latest"]')
      check(`${tag}: кнопка ↓ появилась`, await downBtn.isVisible().catch(() => false))
      if (await downBtn.isVisible().catch(() => false)) {
        await downBtn.click()
        await page.waitForTimeout(1500) // smooth-скролл длинной ленты на 360 может идти дольше секунды
        const atBottom = await page.evaluate(() => { const el = document.querySelector('.omega-chat-scroll'); return el.scrollHeight - el.scrollTop - el.clientHeight < 100 })
        check(`${tag}: ↓ скроллит в конец`, atBottom)
      }
      // ↑ к началу (лента >3 экранов)
      check(`${tag}: кнопка ↑ к началу есть (>3 экранов)`, await page.locator('button[aria-label="К началу ленты"]').isVisible().catch(() => false))
      // догрузка вверх без прыжка
      await page.evaluate(() => { const el = document.querySelector('.omega-chat-scroll'); el.scrollTop = 5 })
      await page.waitForTimeout(600)
      const afterLoad = await page.evaluate(() => { const el = document.querySelector('.omega-chat-scroll'); return { st: el.scrollTop, sh: el.scrollHeight } })
      check(`${tag}: догрузка вверх без прыжка (scrollTop сохранён)`, afterLoad.st > 100, JSON.stringify(afterLoad))
      // вернуться в середину для скрина «шапка на месте»
      await page.evaluate(() => { const el = document.querySelector('.omega-chat-scroll'); el.scrollTop = el.scrollHeight / 2 })
      await page.waitForTimeout(400)
      await shot(page, `luxehub-scroll-mid-${vw}-${theme}`)
    })
  }

  // ── [CHAT-PRO-FIX З6] Управление историей: ⋯ сессии, очистка чата ──
  await withPage(browser, { token: tokens.client, seedHistory: true }, async (page) => {
    await gotoChat(page)
    // ⋯ сессии в шторке → меню → удалить → подтверждение
    await page.locator('button[aria-label="Меню чата"]').first().click()
    await page.waitForTimeout(500)
    const dots = page.locator('button[aria-label="Действия с сессией"]').first()
    check('З6: ⋯ у сессии есть', await dots.isVisible().catch(() => false))
    await dots.click()
    await page.waitForTimeout(300)
    check('З6: меню «Переименовать»/«Удалить»', await page.locator('text=Переименовать').isVisible().catch(() => false) && await page.locator('role=menuitem[name="Удалить"]').isVisible().catch(() => false))
    await shot(page, 'luxehub-session-menu-1280-dark')
    await page.locator('role=menuitem[name="Удалить"]').click()
    await page.waitForTimeout(300)
    check('З6: подтверждение «Удалить чат навсегда?»', await page.locator('text=Удалить чат навсегда?').isVisible().catch(() => false))
    await shot(page, 'luxehub-session-delete-confirm-1280-dark')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    // ⋯ в шапке → очистить историю → подтверждение → лента пустая
    await page.locator('button[aria-label="Ещё"]').first().click()
    await page.waitForTimeout(300)
    check('З6: ⋯ шапки → «Очистить историю»', await page.locator('text=Очистить историю').isVisible().catch(() => false))
    await shot(page, 'luxehub-clear-before-1280-dark')
    await page.locator('text=Очистить историю').click().catch(() => {})
    await page.waitForTimeout(300)
    check('З6: подтверждение «Сообщения удалятся навсегда?»', await page.locator('text=Сообщения удалятся навсегда?').isVisible().catch(() => false))
    await page.locator('button:has-text("Удалить")').first().click().catch(() => {})
    await page.waitForTimeout(600)
    check('З6: после очистки — welcome «Что умею»', await page.locator('text=Что умею').first().isVisible().catch(() => false))
    await shot(page, 'luxehub-clear-after-1280-dark')
  })
} finally {
  await browser.close()
}
console.log(failures ? `\nИТОГ: ❌ ${failures} провалов` : '\nИТОГ: ✅ все проверки зелёные')
process.exit(failures ? 1 : 0)
