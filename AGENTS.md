# AGENTS.md — прошивка для ИИ-кодера (ai-viral-studio)

Контекст проекта: `PROJECT_CONTEXT.md`. История работ: `PROGRESS_REPORT.md` (не дублировать, только дополнять записями по шаблону). Стандарт UI: `docs/UI_QUALITY_GATE.md`.

## Правила работы (v9)

- Работаешь сам, без сварма субагентов.
- 1 ответ = правка 1–3 файлов + `node --check` изменённого. Размышления ≤3 строк, без анонсов.
- Todo текстом (✅/▶/⬜). Wip-коммиты каждые 20–30 мин. `git add` строго по списку файлов. `reports/` не коммитить.
- Ветка от свежего `origin/main`. Один PR = одна зона (payments / storefront / owner / …). Финал задачи: `git push -u origin <ветка>` → отчёт с живой compare-ссылкой, `diff --stat`, скринами/выводом проверок и записью в `PROGRESS_REPORT.md`. **Отчёт без пуша = не сдан.**
- Никакого нового функционала сверх списка задач батча.
- Любое действие вне локального кода (merge, force-redeploy, конфиги/ключи/цены, тест-платежи) — только после approve владельца.
- Негативные тесты в каждом батче, затрагивающем доступ: admin/client дёргает owner-API → 403. Гард-матрица (`qaSecurityFlow`) должна оставаться зелёной.
- Перед сдачей: `npm run build` (frontend) 0 ошибок; `node scripts/qa-launch.mjs` — единая сводка всех QA зелёная; `node scripts/i18n-parity.mjs` чист.

## Экономия токенов

- Поиск по коду — точечно (grep/glob), файлы целиком не перечитывать без нужды.
- Доки библиотек — context7. Скрины — playwright (готовые шаблоны в `scripts/*-shots.mjs`).
- Секреты ЮKassa — только кабинет владельца/MongoDB, НЕ в репо/логах/отчётах (маскируем: `live_...O730`).

## Вопросы владельцу (правило молчания)

- Локальные диалоги вопросов (AskUserQuestion) НЕ используются. Вопрос владельцу — только через `node scripts/ask-owner.mjs` (дублируется в TG owner-бота и в терминал, первый ответ побеждает).
- Вопросы владельцу в процессе батча ЗАПРЕЩЕНЫ, кроме реального блокера (нет доступа/данных, противоречие ТЗ). Всё остальное — решать самому безопасным вариантом.
- Нет ответа 15 минут (считается от отправки в оба канала) → таймаут: самый безопасный вариант, работа продолжается, в отчёт строка «решил сам: X, причина: Y».
- ИСКЛЮЧЕНИЕ: на вопросах ВЫБОРА владельца (дизайн/варианты, цены, публикации, что применять в прод) таймаут-дефолта НЕТ — вопрос ждёт ответа без срока, блокируемый кусок пропускается, работа идёт по остальному. Таймаут-дефолт допустим только на технических мелочах (формулировки, порядок правок, таймауты).
- APPROVE-ЗОНА (деньги, тарифы/PlanConfig, безопасность, удаление данных, секреты) — сам НЕ решать никогда: пропустить кусок, в отчёт «ждёт решения владельца: <что именно>».
- Пуш батча — сам; мерж в main — только ✅ владельца в TG.
- Локальный backend НЕ трогает webhook ботов: `setWebhook`/`deleteWebhook` только на прод-хосте (гард `backend/utils/tgWebhookGuard.js`), локально — пропуск без polling.

## НЕ ЛОМАТЬ (красные зоны)

- Платежи/ЮKassa (создание платежа, webhook-верификация, refund).
- `PlanConfig` и тарифы, редактор цен, витрина пакетов кредитов, реферальная механика (`OwnerSettings.referralPercent`).
- Боты (Telegram), лендинг, рубильники (owner feature flags), rate-limit, view-as.
- Гард-матрицу Б5 (authorize/role checks ослаблять запрещено).
- Логику entitlement/снапшотов аддонов (`UserAddon.includesSnapshot/featuresSnapshot`).
- Webhook-гард (`backend/utils/tgWebhookGuard.js`), approve-зону, Hard Limit, Auto Downgrade.
- ask-owner / ownerFreeText / изоляцию owner-контура / OMEGA Control / двойной канал вопросов.
- Паузу CHANNEL-AUTO, голос владельца, удаление постов.
- Дизайн PR #60 (Фокус-чат / Люкс-хаб / Командный центр).

## Инфраструктура (факты)

- Прод: `https://aiviral-studio.ru` (Cloudflare Pages, SPA-fallback — ТОЛЬКО rewrite `/* /index.html 200` в `frontend/public/_redirects`, БЕЗ 301/302/308 и БЕЗ «!»). Запрещено: rewrite на `*.html`-цель (Pages каноникализирует `.html` 308-редиректом → петля, инцидент 06.09.2026: прод лежал из-за `/* /200.html 200`). Файл `200.html`/spa-200.mjs не нужны и запрещены.
- Любое изменение `_redirects`/redirect-логики — только с curl-пруфами на preview-деплое Pages ДО мержа (`/` + 2 прямых роута → 200, 0 редиректов). «Не сломано — не трогай» на проде важнее страховок.
- Backend: `https://aiviral-backend.onrender.com` (Render). БД локального backend ОТДЕЛЬНАЯ от прода (поэтому qa-скрипты проксируют prod-API на локальный); прод-БД — только через prod API / Render env.
- БД: MongoDB Atlas, у прода и локали РАЗНЫЕ базы. ShopID ЮKassa — live (`live_...O730`), ключи в Render env (прод) / кабинете владельца, hot-reload через `getProviderKey`.
- TG: owner-бот `@omega_aiviral_bot`, клиентский `@aiviral_alerts_bot`, канал `@aiviralstudio` (функциональные боты — оба; `qa-bots.mjs` проверяет webhook обоих).
- Тест-карта ЮKassa: `5555 5555 5555 4477 · 12/25 · CVV 000`.
- [CHAT-PRO] Выбор владельца (дизайн/макеты) = минимум 3 варианта скринами в TG одним альбомом; выбор из одного варианта не считается. Скрины каждого варианта: desktop тёмная+светлая + iPhone 390.
- [CHAT-PRO] Режим chat CreativeHub = «Люкс-хаб» (вариант B, выбор владельца 07.09.2026): `frontend/src/components/chat-pro/LuxeHubChat.jsx` — оболочка над `OmegaChat` (embedded, вся логика чата там: голос/вложения/превью/саппорт/апселл). Сайдбар кольца баланса: xl при свёрнутых инсайтах хаба, иначе ≥1920 (не сужать ленту). Поиск по ленте — проп `searchQuery` в OmegaChat. Черновик инпута — localStorage `omega_chat_draft`. Старый UI не удалять до ✅ владельца.
- [ASK-OWNER-FIX] TG-канал ask-owner шлёт parse_mode=HTML: весь пользовательский текст (context/question/note) экранируется (`& < >`), иначе TG API 400 can't parse entities и сообщение молча не доходит (инцидент 07.09.2026 — отчёт с «<1МБ» не дошёл). Лимит 4096 — контекст обрезается, не роняет отправку. Код ответа TG API всегда в логе отправки.
- [HOTFIX-FINAL-2] Ключи провайдеров: выключенный в кабинете ключ = ПОЛНЫЙ запрет, env-фолбэки `|| process.env.*_API_KEY` после `getProviderKey` запрещены (мёртвый ключ поднимался обратно в ротацию). 401/403 от провайдера → `backend/utils/providerKeyGuard.js#disableProviderKey` (isActive=false в БД + стоп кэша + TG-алерт). Новый ключ — только владелец через кабинет.
- [HOTFIX-FINAL-2] Waitlist лендинга (`/api/public/waitlist`) пишет в Mongo (`Waitlist`), TG-алерт владельцу на каждую новую заявку. In-memory хранилища для заявок запрещены (Render рестартит — данные умирали).
- [HOTFIX-FINAL-2] Owner-бот: `/balance email`, `/givecredits email N` (owner-only, через `creditGenerations`). Каждый onText-хендлер обязан иметь try/catch с ответом — молчаливые падения = баг.
- [HOTFIX-FINAL-2] House-ads: `frontend/src/components/ads/HouseAdSlot.jsx` (спека Р3): чат=топ-баннер ≤34px (все ширины, инпут не сдвигает), сайдбар-карточка ≥1440, пилюля 768–1439, нижняя плашка <768 (не на /creative-hub — там FAB/навбар). Ротация аддоны→апгрейд→рефералка→YT-разведка 10с, crossfade 275ms, pulse 3.5с, reduced-motion=статика, «Скрыть на день» per-slot, owner/admin/staff не видят.
- [HOTFIX-FINAL-2] Бандл: route-level lazy для ВСЕХ экранов кроме лендинга (App.jsx); manualChunks: vendor/icons/charts/motion/ai/omega — recharts и framer-motion не должны попадать в initial. Цель: initial <1МБ (сейчас ~888КБ; index 556КБ, было 2.3МБ).
- [HOTFIX-FINAL-2] CORS: allowlist в `backend/config/cors.js` (env `CORS_ORIGINS`/`FRONTEND_URL` + дефолты), wildcard запрещён. Проверка curl: allowed origin → 204 + ACAO конкретного origin; чужой origin → 403 без ACAO.
- [HOTFIX-FINAL-2] AuthContext `/auth/me` — обязателен таймаут (AbortController 10с): без него TG WebView/спящий Render = вечный спиннер мини-аппа. Мини-апп: watchdog 12с → error-state с retry.

## Актуализация AGENTS.md (постоянное правило)

- AGENTS.md читается в начале каждой сессии. По ходу работы сам вносишь новые правила/факты и удаляешь устаревшее.
- Конфликт правил (AGENTS.md vs ТЗ батча) — строкой в отчёт + ask-owner.

## Стандарты

- Новые экраны — по `docs/UI_QUALITY_GATE.md`: Esc/focus-trap через `useModalA11y`, тултипы у обрезанного, стили только дизайн-системы, reduced-motion, 360/428/768/1280/1920 × RU/EN без скроллов/налезаний, empty-state inline.
- i18n: ключи во все 4 locale-файла (`frontend/src/locales/{ru,en}.json`, `frontend/public/locales/{ru,en}.json`), `i18n-parity` обязателен.
- Секреты — только env. Никаких ключей/токенов/паролей в коде и коммитах.
- Логика не меняется, если задача про представление — и наоборот: объём задачи не расширять самовольно.

## ПРАВИЛО ЭКОНОМИКИ

- Цены меняются только через кабинет владельца / `PlanConfig`. Кодом значения тарифов не править.
- Себестоимость 1 кредита ≈ 0.24₽ — учитывать в любых расчётах фич, расходующих генерации.
- Любая новая платная фича — с расчётом маржи в отчёте. Маржинальный пол: платные тарифы не ниже 70%.
- Перед изменением цен (даже обоснованных) — согласование владельца.

## CI

- `.github/workflows/ci.yml`: на PR и пуш в `fix/*`/`ci/*`/`main` — `node --check` backend, frontend build, прогон `scripts/qa-launch.mjs` (Mongo service + backend :18080 + preview :4173). Падение любого шага = PR красный.
- `node scripts/qa-launch.mjs` — «одна кнопка» перед запуском/сдачей: все qa-скрипты последовательно, сводка скрипт → ✅/❌ → время. Новые `scripts/qa-*.mjs` и `backend/scripts/qa*.js` подхватываются автоматически.
