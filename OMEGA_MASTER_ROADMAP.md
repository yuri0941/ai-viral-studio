# OMEGA MASTER ROADMAP — Полный план развития AI Viral Studio

> **Проект:** AI Viral Studio  
> **Стек:** React 18 + Vite + Tailwind + Node.js + Express + MongoDB  
> **Назначение файла:** Единый документ для Kimi Code. Содержит ВСЕ фичи вне основного `CONTEXT.md`, сгруппированные по волнам исполнения.  
> **Когда использовать:** После завершения P11 (запуск + деплой). Kimi Code читает этот файл и исполняет по порядку.  
> **Правила исполнения:** Один файл за раз → diff → Apply → ждать "Дальше". Обновлять `PROGRESS_REPORT.md` после каждого пункта.

---

## СТРУКТУРА ИСПОЛНЕНИЯ

```
Волна 1: Pre-Launch FOMO (делаем ПАРАЛЛЕЛЬНО с P9–P11)
Волна 2: Post-Launch Growth (0–2 мес после релиза)
Волна 3: Monetization Engine (2–4 мес)
Волна 4: Autonomy & Scale (4–8 мес)
Волна 5: Ecosystem & API (8–12 мес)
Волна 6: Future Vision (12+ мес)
```

---

# ═══════════════════════════════════════
# ВОЛНА 0: PERFORMANCE & INFRASTRUCTURE
# (Делаем ПАРАЛЛЕЛЬНО с P9–P11, до релиза)
# ═══════════════════════════════════════

## 0.1 Code Splitting + Lazy Loading
**Файлы:** `frontend/src/App.jsx`, `frontend/src/routes/`

**Что делать:**
- React.lazy() + Suspense для всех страниц.
- Разделить бандл: landing (~200KB), dashboard (~400KB), admin (~300KB).
- Fallback: красивый skeleton-loader пока грузится.
- Vite: `manualChunks` в `vite.config.js` для разделения vendor-библиотек.

## 0.2 React Query / SWR (кэширование API)
**Файлы:** `frontend/src/hooks/useApi.js`, `frontend/src/providers/QueryProvider.jsx`

**Что делать:**
- Установить `@tanstack/react-query`.
- Все GET-запросы кэшировать на 5 минут.
- Инвалидация кэша при mutation (создание/обновление/удаление).
- Stale-while-revalidate: показываем старые данные, фоном обновляем.
- Оффлайн-режим: кэшированные данные доступны без сети.

## 0.3 Virtual Scrolling (большие таблицы)
**Файлы:** `frontend/src/components/VirtualTable.jsx`

**Что делать:**
- `react-window` или `@tanstack/react-virtual`.
- Таблица на 10K строк — 60 FPS, без лагов.
- Lazy-loading изображений в таблицах (`loading="lazy"`).

## 0.4 MongoDB индексы
**Файлы:** `backend/models/*.js`

**Что делать:**
- Индексы на частые поля: `email`, `role`, `projectId`, `status`, `createdAt`.
- Compound-индексы: `{ projectId: 1, status: 1 }` для фильтров.
- Text-индекс для поиска по контенту.
- Explain-план запросов: убедиться, что нет COLLSCAN.

## 0.5 Redis (кэш + сессии + rate limit)
**Файлы:** `backend/config/redis.js`, `backend/middleware/cache.js`

**Что делать:**
- Установить Redis (Upstash бесплатный для старта).
- Кэшировать тяжёлые запросы (аналитика, списки) на 5 мин.
- Хранить сессии в Redis (а не в памяти Node.js).
- Rate limiting per IP: 100 запросов/мин.
- Pub/Sub для real-time уведомлений.

## 0.6 CDN + Image Optimization
**Файлы:** `frontend/public/`, `backend/services/imageOptimizer.js`

**Что делать:**
- Все картинки в WebP/AVIF (fallback в JPEG).
- Lazy-loading изображений (`loading="lazy"`, `IntersectionObserver`).
- Responsive images (`srcset`) для мобильных.
- CDN: Cloudflare (бесплатно) или Vercel Edge Network.
- Backend: авто-конвертация загружаемых картинок в WebP.

## 0.7 Bundle Size Monitoring
**Файлы:** `vite.config.js`, `frontend/package.json`

**Что делать:**
- `rollup-plugin-visualizer` — анализ размера бандла.
- Лимит: warning при >500KB main chunk.
- Tree-shaking: убрать неиспользуемые импорты.
- Динамический импорт тяжёлых библиотек (chart.js, editor).

## 0.8 Socket.io (Real-Time)
**Файлы:** `backend/socket.js`, `frontend/src/hooks/useSocket.js`

**Что делать:**
- Socket.io для real-time уведомлений.
- События: `new_notification`, `chat_message`, `task_update`, `approval_request`.
- Комнаты: пользователь подключается в комнату своего `userId`.
- Авторизация через JWT при подключении.
- Fallback на polling, если WebSocket заблокирован.

---

# ═══════════════════════════════════════
# ВОЛНА 7: PWA + MOBILE
# (0–3 месяца после релиза)
# ═══════════════════════════════════════

## 7.1 Progressive Web App (PWA)
**Файлы:** `frontend/public/manifest.json`, `frontend/src/service-worker.js`, `frontend/vite.config.js`

**Что делать:**
- `manifest.json`: имя, иконки (192x192, 512x512), theme_color, display: standalone.
- Service Worker (Workbox): кэширование статики, API-ответов, изображений.
- **Add to Home Screen**: кнопка "Установить приложение" на iOS/Android.
- **Offline mode**: кэшированные страницы работают без интернета.
- **Background sync**: действия в офлайне синхронизируются при появлении сети.
- **Push-уведомления**: "OMEGA: пост готов к публикации" — даже если браузер закрыт.

## 7.2 Capacitor (Mobile App из React)
**Файлы:** `mobile/` (отдельная папка), `capacitor.config.json`

**Что делать:**
- Установить `@capacitor/core`, `@capacitor/cli`.
- Оборачиваем текущий React-код в нативную оболочку.
- Сборка APK (Android) и IPA (iOS) из ОДНОГО кода.
- Нативные плагины: камера, push-уведомления, геолокация, биометрия (Face ID).
- Deeplinks: `aiviral://post/123` — открыть конкретный пост из push.
- App Store / Google Play публикация (через 2–3 мес после релиза).

## 7.3 Mobile-First UI Adaptations
**Файлы:** `frontend/src/components/mobile/`

**Что делать:**
- Bottom Navigation (как в Instagram) для мобильных.
- Swipe-жесты: свайп вправо — одобрить, влево — отклонить (Approval Stream).
- Pull-to-refresh на всех списках.
- Touch-optimized кнопки (минимум 44x44px).
- Dark mode по умолчанию (сохраняет батарею OLED).

---

# ═══════════════════════════════════════
# ВОЛНА 8: OMEGA OWNER APP
# (3–6 месяцев после релиза)
# ═══════════════════════════════════════

## 8.1 Архитектура Owner App
**Файлы:** `owner-app/` (отдельный React/Capacitor проект)

**Что делать:**
- Новый frontend-проект `owner-app/` — отдельный репозиторий или папка.
- Использует ТОТ ЖЕ backend API (`localhost:5000/api/`).
- Отдельный build: `npm run build:owner` → деплой на `owner.aiviral.studio`.
- Авторизация: те же JWT-токены, те же роли.
- Только для `role: 'owner'` — middleware проверяет доступ.

## 8.2 Command Center
**Файлы:** `owner-app/src/pages/CommandCenter.jsx`

**Что делать:**
- Все проекты в одном окне: карточки с цветным статусом.
- Метрики: доход, расход, прибыль, рост за неделю.
- Алерты: красные бейджи на проблемных проектах.
- Графики: Sparklines (мини-графики) для быстрой оценки тренда.
- Фильтры: по нишам, по командам, по доходу.

## 8.3 Team Pulse (real-time)
**Файлы:** `owner-app/src/pages/TeamPulse.jsx`

**Что делать:**
- Кто онлайн (зелёная точка).
- Что делает прямо сейчас: "Пишет пост для Кофейни X".
- KPI в реальном времени: тикеты/час, закрытые задачи, рейтинг.
- Heatmap активности: календарь с цветной интенсивностью работы.
- Push: "Алексей не в сети 2 часа — проверить?"

## 8.4 Approval Stream (Tinder-стиль)
**Файлы:** `owner-app/src/pages/ApprovalStream.jsx`

**Что делать:**
- Карточка: "OMEGA хочет опубликовать пост 'Летнее меню' в 19:00".
- Свайп вправо — ✅ Одобрить.
- Свайп влево — ⛔ Отклонить.
- Свайп вверх — ✏️ Изменить (открывает редактор).
- Batch-approve: "Одобрить все на сегодня?" — одна кнопка.
- История: все решения с timestamp.

## 8.5 OMEGA Voice (Mobile)
**Файлы:** `owner-app/src/components/VoiceCommand.jsx`

**Что делать:**
- Удержание кнопки → говорите → Web Speech API (или Whisper API).
- Команды:
  - "Покажи доход за неделю" → график.
  - "Одобри все посты на сегодня" → batch-approve.
  - "Какие тикеты не решены?" → список.
  - "Создай пост про кофе" → OMEGA генерирует → на одобрение.
- TTS-ответ: OMEGA голосом отвечает на телефоне (ElevenLabs).

## 8.6 Reports & PDF
**Файлы:** `owner-app/src/pages/Reports.jsx`, `backend/services/pdfGenerator.js`

**Что делать:**
- Свайп вниз — обновить отчёт.
- Свайп вверх — поделиться (Telegram, Email, WhatsApp).
- Авто-генерация PDF: недельный, месячный, квартальный.
- Push каждое утро: "Ваш Morning Brief готов".
- Сравнение периодов: "Июнь vs Июль: +23% дохода".

## 8.7 Emergency Stop (Mobile)
**Файлы:** `owner-app/src/components/EmergencyStop.jsx`

**Что делать:**
- Большая красная кнопка на главном экране.
- Двойное нажатие для активации (защита от случайного).
- Push-уведомление: "🚨 Emergency Stop активирован. Все автономные действия OMEGA остановлены."
- Статус: зелёный (OMEGA активна) / красный (остановлена) / жёлтый (ограниченный режим).

---

# ═══════════════════════════════════════
# ВОЛНА 9: DESKTOP APP
# (6–12 месяцев после релиза)
# ═══════════════════════════════════════

## 9.1 Tauri (Desktop App)
**Файлы:** `desktop/` (отдельная папка), `desktop/src-tauri/`

**Что делать:**
- Tauri (Rust) вместо Electron — вес приложения <5MB (vs 150MB Electron).
- Обернуть текущий React-код в нативное окно.
- Платформы: Windows, macOS, Linux.
- Авто-обновление (Tauri updater).
- Нативное меню: File, Edit, View, OMEGA.

## 9.2 Tray & Hotkeys
**Файлы:** `desktop/src-tauri/src/main.rs`

**Что делать:**
- Иконка в системном трее (Windows) / меню-баре (macOS).
- Tray-меню: быстрые действия ("Новый пост", "Открыть OMEGA", "Emergency Stop").
- Горячие клавиши:
  - `Ctrl+Shift+O` — открыть OMEGA.
  - `Ctrl+Shift+N` — быстрое уведомление.
  - `Ctrl+Shift+E` — Emergency Stop.
- Push-уведомления как native OS notifications (не браузерные).

## 9.3 Desktop-Only Фичи
**Файлы:** `desktop/src/components/`

**Что делать:**
- **Always on Top**: окно OMEGA поверх всех окон (для мониторинга).
- **Picture-in-Picture**: мини-окно с KPI, которое висит поверх рабочего стола.
- **Drag & Drop файлов**: перетащить видео в окно OMEGA → авто-загрузка.
- **Multi-monitor**: открыть Command Center на втором мониторе.
- **Offline-first**: полная работа без интернета, синхронизация при подключении.

---

# ═══════════════════════════════════════
# ВОЛНА 1: PRE-LAUNCH FOMO
# (Параллельно с P9–P11, до первых клиентов)
# ═══════════════════════════════════════

## 1.1 Waitlist с геймификацией
**Файлы:** `frontend/src/pages/landing/WaitlistSection.jsx`, `backend/models/Waitlist.js`, `backend/routes/waitlist.js`

**Что делать:**
- Форма на лендинге: email + ниша + размер бизнеса.
- После отправки: "Вы № 1,247 в очереди. Осталось ~14 дней до вашего доступа."
- Геймификация:
  - Пригласи друга по ссылке → +50 мест вперёд.
  - Подпишись на Telegram-канал → +20 мест.
  - Подпишись на TikTok → +15 мест.
  - Заполни опрос (3 вопроса) → +10 мест.
- Топ-100 получают Founding Member Badge + -30% навсегда.
- Backend: хранить `position`, `referrals`, `points`, `badge`.
- Email-уведомления: "Вы продвинулись с 1247 на 892 место!"

## 1.2 Viral Demo Generator (на лендинге, без регистрации)
**Файлы:** `frontend/src/pages/landing/ViralDemo.jsx`, `backend/routes/demo.js`

**Что делать:**
- Блок на лендинге: "Попробуй OMEGA бесплатно".
- Поле: "Ваша ниша" (кофейня, бьюти, автобизнес...).
- OMEGA генерирует 3 хука + скрипт 15 сек прямо на сайте.
- После генерации: "Хочешь полную версию? Встань в очередь →" (переход в waitlist).
- Лимит: 3 демо с одного IP, потом требует email.
- Backend: rate limiting, кэш ниш (не тратить API на повторы).

## 1.3 Founding Member Program
**Файлы:** `frontend/src/pages/landing/FoundingMember.jsx`, `backend/models/FoundingMember.js`

**Что делать:**
- Первые 100 из waitlist → золотой бейдж "Founder" навсегда.
- -30% на все тарифы навсегда.
- Имя/логотип в разделе "Основатели" (публично, по желанию).
- Доступ к закрытому Telegram-чату с разработчиками.
- Ранний доступ к новым фичам (Beta Tester).
- Backend: `isFoundingMember: Boolean`, `founderBadge: String`, `discountPercent: Number`.

## 1.4 Public Roadmap + Голосование
**Файлы:** `frontend/src/pages/landing/PublicRoadmap.jsx`, `backend/models/RoadmapVote.js`

**Что делать:**
- Страница /roadmap с текущим статусом разработки.
- Колонки: "В разработке", "Тестирование", "Запущено", "Запланировано".
- Каждая фича — карточка с голосами (👍).
- Пользователи голосуют (1 голос на фичу).
- Топ-5 фичей по голосам — приоритет для следующего спринта.
- OMEGA пишет обновления: "OMEGA Voice — 847 голосов, начинаем разработку!"

## 1.5 Beta Slots Scarcity
**Файлы:** `frontend/src/components/BetaCounter.jsx`

**Что делать:**
- На лендинге: "Открываем 50 слотов на бета-тест. Осталось: 12."
- Обновление в реальном времени (WebSocket или polling).
- Когда слоты кончились: "Следующая волна через 7 дней. Встань в очередь."
- FOMO: таймер обратного отсчёта до следующей волны.

---

# ═══════════════════════════════════════
# ВОЛНА 2: POST-LAUNCH GROWTH
# (0–2 месяца после релиза)
# ═══════════════════════════════════════

## 2.1 "Сделано в OMEGA" Watermark
**Файлы:** `frontend/src/components/OMEGAWatermark.jsx`, `backend/models/WatermarkSettings.js`

**Что делать:**
- На каждом видео/посте/карусели, созданном через платформу — маленький логотип OMEGA + ссылка aiviral.studio.
- Клиент может отключить: Pro+ тариф ($10/мес дополнительно) или Enterprise.
- В настройках проекта: toggle watermark + выбор позиции (низ-справа, низ-слева, центр).
- Backend: `watermarkEnabled: Boolean`, `watermarkPosition: String`.

## 2.2 Referral Program 2.0
**Файлы:** `frontend/src/pages/owner/ReferralProgram.jsx`, `backend/models/Referral.js`, `backend/routes/referrals.js`

**Что делать:**
- Не просто "приведи друга — скидка".
- Уровни:
  - 1 друг → $10 кредитов.
  - 3 друга → открыть Agentic Mode бесплатно на 1 мес.
  - 5 друзей → -20% навсегда.
  - 10 друзей → Affiliate Partner (40% комиссии с первой оплаты каждого).
- Персональная реферальная ссылка с UTM.
- Дашборд: сколько приведено, сколько заработано, график.
- Backend: `referralCode`, `referredBy`, `referralEarnings`, `referralTier`.

## 2.3 Viral Leaderboard
**Файлы:** `frontend/src/pages/owner/ViralLeaderboard.jsx`, `backend/routes/leaderboard.js`

**Что делать:**
- Публичный топ клиентов по вирусности (анонимно по умолчанию, можно раскрыть имя).
- Метрики: просмотры, CTR, подписчики, охват.
- Периоды: неделя, месяц, всё время.
- Категории: по нишам (кофейни, бьюти, автобизнес).
- Призы: топ-3 каждой недели — бесплатные кредиты/фичи.

## 2.4 OMEGA Challenge (ежемесячный конкурс)
**Файлы:** `frontend/src/pages/owner/OMEGAChallenge.jsx`, `backend/models/Challenge.js`

**Что делать:**
- Тема месяца: "Лучший вирусный пост про лето".
- OMEGA оценивает: вирусность, креатив, вовлечённость.
- Призы: 1 место — 3 мес бесплатно + фичеринг в блоге, 2 место — 1 мес, 3 место — кредиты.
- Авто-генерация кейса победителя: OMEGA пишет статью "Как [Название] набрал 2M просмотров".

## 2.5 Case Study Auto-Generator
**Файлы:** `backend/services/caseStudyGenerator.js`, `frontend/src/pages/blog/CaseStudies.jsx`

**Что делать:**
- OMEGA анализирует успешного клиента (рост метрик за 30 дней).
- Авто-пишет кейс: проблема → решение (OMEGA) → результат (цифры).
- Генерирует обложку (через Replicate/DALL-E API).
- Публикует в блоге (/blog) — SEO + доверие.
- Клиент получает уведомление: "Мы написали о вас кейс. Одобрить публикацию?"

---

# ═══════════════════════════════════════
# ВОЛНА 3: MONETIZATION ENGINE
# (2–4 месяца после релиза)
# ═══════════════════════════════════════

## 3.1 Pay-per-Generation (сверхлимит)
**Файлы:** `backend/models/UsageQuota.js`, `frontend/src/components/QuotaWidget.jsx`

**Что делать:**
- Включено в тариф: Creator — 100 генераций/мес, Pro — 500, Agency — 5000.
- Каждая следующая — $0.05 (или пакет: 100 за $4).
- Виджет в интерфейсе: "Осталось 47/500 генераций. Докупить +100 за $4?"
- Backend: счётчик `generationsUsed`, `generationsLimit`, авто-списание с баланса.

## 3.2 Revenue Share на рекламе
**Файлы:** `backend/models/AdCampaign.js`, `frontend/src/pages/advertiser/AdRevenue.jsx`

**Что делать:**
- OMEGA создаёт ad creative (текст, картинка, CTA).
- Клиент запускает рекламу через Meta/Google Ads.
- AI Viral Studio берёт 5% от ad spend клиента.
- Дашборд: сколько потрачено на рекламу, сколько заработала платформа.
- Интеграция с Meta Marketing API (read-only для отслеживания spend).

## 3.3 Data Intelligence Reports
**Файлы:** `backend/services/intelligenceReport.js`, `frontend/src/pages/owner/IntelligenceReports.jsx`

**Что делать:**
- OMEGA собирает анонимные данные всех клиентов.
- Генерирует отчёты: "Аналитика TikTok для кофеен Москвы — Q3 2026".
- Продаёт за $49–149.
- Авто-обновление каждый квартал.
- Подписка: $19/мес за ежемесячные отчёты.

## 3.4 White-Label Agency
**Файлы:** `backend/models/WhiteLabel.js`, `frontend/src/pages/agency/WhiteLabelSettings.jsx`

**Что делать:**
- Agency тариф ($299/мес) → скрыть бренд AI Viral Studio.
- Свой домен (CNAME), свой логотип, свои цвета.
- Клиент агентства видит только кабинет агентства.
- OMEGA работает под капотом, но бренд — агентства.
- Backend: `whiteLabelDomain`, `whiteLabelLogo`, `whiteLabelColors`.

## 3.5 OMEGA Consulting (High-Ticket)
**Файлы:** `frontend/src/pages/landing/Consulting.jsx`, `backend/routes/consulting.js`

**Что делать:**
- OMEGA генерирует стратегию: аудит соцсетей + 3 месяца плана + KPI.
- Продаётся за $500–2000 как "OMEGA Strategy Session".
- Авто-генерация PDF-отчёта (30+ страниц).
- Человек (вы или sales) закрывает сделку, OMEGA готовит материалы.

---

# ═══════════════════════════════════════
# ВОЛНА 4: AUTONOMY & SCALE
# (4–8 месяцев после релиза)
# ═══════════════════════════════════════

## 4.1 OMEGA AutoPilot (полная автономность)
**Файлы:** `frontend/src/ai/omega/omegaAutoPilot.js`, `backend/services/autoPilot.js`

**Что делать:**
- OMEGA сама пишет посты по расписанию (без команды).
- Сама публикует (если автопостинг готов) или кладёт в очередь на утверждение.
- Сама анализирует конверсии и корректирует стратегию.
- Уровни автономности:
  - Ручной: всё через одобрение.
  - Полуавто: до $100/сделка — без одобрения.
  - Авто: в рамках стратегии — полностью сама.
- Emergency Stop всегда доступен.

## 4.2 Predictive Engine / Viral Score 2.0
**Файлы:** `backend/services/predictiveEngine.js`, `frontend/src/components/ViralScore.jsx`

**Что делать:**
- Предсказание вирусности ДО публикации: "Этот пост наберёт 50K ±15%".
- Churn Prediction: предсказывает отток клиента за 7 дней → предлагает персональную скидку.
- Best Time to Post: индивидуально под аудиторию каждого клиента.
- Ценообразование: "Ваши подписчики онлайн в 19:34 — публикуйте тогда."

## 4.3 Brand Voice Training
**Файлы:** `backend/services/brandVoice.js`, `frontend/src/pages/owner/BrandVoice.jsx`

**Что делать:**
- Клиент загружает 20–50 своих постов (или ссылки на соцсети).
- OMEGA анализирует: tone (formal/casual/funny), vocabulary, emoji-стиль, длина предложений.
- Создаёт Brand Voice Profile.
- Все последующие генерации — в этом стиле.
- Можно создать несколько голосов (для разных проектов).

## 4.4 Content Repurposing Pipeline (1 → 50)
**Файлы:** `backend/services/contentRepurposer.js`, `frontend/src/pages/owner/Repurposer.jsx`

**Что делать:**
- Клиент загружает 1 видео (60 сек).
- OMEGA автоматически создаёт:
  - Reels (30 сек)
  - Shorts (15 сек)
  - Stories (15 сек)
  - GIF (3 сек)
  - Twitter-thread (5 твитов)
  - Instagram карусель (5 слайдов)
  - Telegram-пост (текст)
- Адаптация под каждую платформу: длина, стиль, хэштеги, CTA.
- Auto-Update: находит старые хиты клиента → предлагает ремиксы с новыми данными.

## 4.5 Real-Time Trend Detection
**Файлы:** `backend/services/trendScanner.js`, `frontend/src/components/TrendAlert.jsx`

**Что делать:**
- OMEGA сканирует Reddit, Twitter/X, TikTok каждые 30 минут.
- Ищет тренды, релевантные нишам клиентов.
- Если находит: генерирует реактивный пост → кладёт на одобрение.
- Уведомление: "🚨 Тренд в вашей нише: [тема]. OMEGA подготовила пост. Одобрить?"

## 4.6 Organic → Paid Pipeline
**Файлы:** `backend/services/organicToPaid.js`, `frontend/src/pages/advertiser/OrganicToPaid.jsx`

**Что делать:**
- OMEGA анализирует лучший органический пост (по CTR/вовлечённости).
- Кнопка "Сделать рекламу из этого поста".
- Генерирует 3 варианта ad creative (A/B/C).
- Передаёт в Meta Ads Manager / Google Ads через API.
- Дашборд: сколько потрачено, сколько заработано, ROI.

## 4.7 Approval Workflows (Human-in-the-Loop)
**Файлы:** `backend/models/ApprovalQueue.js`, `frontend/src/pages/owner/ApprovalQueue.jsx`

**Что делать:**
- Все автономные действия OMEGA проходят через очередь одобрения.
- Карточка: "OMEGA хочет: [действие]. Одобрить / Отклонить / Изменить."
- Настройки: "Авто-одобрять если риск < 30%", "Всегда спрашивать перед публикацией".
- История одобрений: кто, когда, что.

## 4.8 Competitive Intelligence (Auto)
**Файлы:** `backend/services/competitorIntel.js`, `frontend/src/pages/owner/CompetitorIntel.jsx`

**Что делать:**
- OMEGA мониторит 5 конкурентов клиента (по URL соцсетей).
- Каждое утро: сводка "Вчера у конкурента Y взлетел Reels про Z. Вот ваш адаптированный вариант."
- Анализ: частота постов, хэштеги, время публикаций, форматы.
- График: вы vs конкуренты по ключевым метрикам.

## 4.9 Swarm Intelligence
**Файлы:** `backend/services/swarmIntel.js`

**Что делать:**
- OMEGA учится на данных ВСЕХ клиентов платформы (анонимно).
- "У 23 кофеен взлетел пост 'POV: утро без кофе' → рекомендую вашей кофейне адаптированную версию."
- Кросс-индустриальный перенос: "Тренд из бьюти (ASMR-распаковки) отлично зайдёт в автобизнесе."

## 4.10 Emotional AI
**Файлы:** `backend/services/emotionalAI.js`

**Что делать:**
- Читает тональность комментариев аудитории в реальном времени.
- Если подписчики устали от мотивации → предлагает юмор/иронию.
- Если волна негатива → генерирует "выпускающий" пост с извинениями.
- Crisis Detection: алерт за 15 минут до вирусного негатива.

## 4.11 Dream Mode (Ночная смена)
**Файлы:** `backend/services/dreamMode.js`, `frontend/src/components/DreamBriefing.jsx`

**Что делать:**
- Ночью: анализ глобальных трендов, генерация 10 идей на завтра.
- Утром в 8:00: "Breakfast Briefing" — сводка + готовый скрипт + кнопка "✅ Запланировать".
- Клиент просыпается → на телефоне готовый контент.

## 4.12 Neuro-Sales (Психотипы)
**Файлы:** `backend/services/neuroSales.js`

**Что делать:**
- Анализирует психотип потенциального клиента (если есть данные).
- Генерирует контент/письма под психотип:
  - Логик: цифры, ROI, таблицы.
  - Эмоционал: истории, боли, мечты.
  - Дефицит: "Только 2 места осталось".
  - Социальное доказательство: "Уже 500+ агентств используют".

## 4.13 Legal & Compliance Shield
**Файлы:** `backend/services/legalShield.js`, `frontend/src/components/LegalCheck.jsx`

**Что делать:**
- Авто-проверка контента на копирайт (музыка, фото, шрифты).
- РФ: авто-маркировка "реклама", проверка на запрещённые темы.
- EU: GDPR, cookie consent, право на забвение.
- США: FTC disclosure для партнёрских постов.
- Предупреждение ДО публикации: "⚠️ Возможен риск страйка. Заменить музыку?"

## 4.14 Dynamic Pricing AI
**Файлы:** `backend/services/dynamicPricing.js`

**Что делать:**
- Uber-like ценообразование: спрос высокий → цена +20%.
- Персональные скидки неактивным клиентам.
- Если дизайнеры загружены на 95% → новые заказы дороже на 30%.
- Авто-аукцион при перегрузке.

## 4.15 Voice Interface + Multimodal
**Файлы:** `frontend/src/components/VoiceInterface.jsx`, `backend/services/voiceService.js`

**Что делать:**
- Голосовое управление: "Омега, создай пост про кофе".
- Голосовые ответы (TTS через ElevenLabs API).
- Текст → видео с аватаром (HeyGen/Runway API).
- Текст → изображение (DALL-E/Midjourney API).
- OMEGA пишет сценарий → генерирует видео/голос/картинку.

---

# ═══════════════════════════════════════
# ВОЛНА 5: ECOSYSTEM & API
# (8–12 месяцев)
# ═══════════════════════════════════════

## 5.1 OMEGA API (B2B2B)
**Файлы:** `backend/routes/api/v1/omegaAPI.js`, `frontend/src/pages/developer/APIDocs.jsx`

**Что делать:**
- Другие SaaS (CRM, конструкторы сайтов) интегрируют OMEGA.
- Документация, rate limits, webhooks.
- Цена: $0.01/запрос + $99/мес базовый.
- Dashboard для разработчиков: usage, billing, keys.

## 5.2 WhatsApp Business API
**Файлы:** `backend/services/whatsappService.js`, `frontend/src/pages/integrations/WhatsAppSettings.jsx`

**Что делать:**
- Интеграция WhatsApp Business API.
- OMEGA отвечает клиентам в WhatsApp.
- Авто-ответы, рассылки, поддержка.
- В СНГ и Индии — основной канал коммуникации.

## 5.3 Slack / Discord / Notion / ClickUp
**Файлы:** `backend/services/integrations/`, `frontend/src/pages/integrations/`

**Что делать:**
- Slack/Discord: OMEGA как бот, выполняет задачи из чатов.
- Notion: авто-создание документов, баз знаний.
- ClickUp: авто-создание задач из OMEGA-рекомендаций.
- Shopify/WooCommerce: анализ продаж → генерация постов под товары в наличии.
- Zapier/Make: OMEGA запускает любые сценарии.

## 5.4 Physical World Bridge
**Файлы:** `backend/services/physicalWorld.js`

**Что делать:**
- QR-генератор с аналитикой сканирований (меню, визитки).
- Интеграция с типографиями (авто-заказ печати флаеров/стикеров).
- Бронирование фотостудий/коворкингов через API.
- Доставка для съёмочной группы (Delivery Club / Yandex Eats API).

## 5.5 Auto-Franchise Generator
**Файлы:** `backend/services/franchiseGenerator.js`

**Что делать:**
- Генерация брендбука, SOP, обучающих материалов для франчайзи.
- White-label продажа платформы под брендом клиента.
- Авто-онбординг новых франчайзи через OMEGA.

## 5.6 Multi-Project Workspaces
**Файлы:** `backend/models/ProjectWorkspace.js`, `frontend/src/pages/owner/Workspaces.jsx`

**Что делать:**
- 1 клиент-агентство = N проектов (брендов).
- Каждый workspace: свой OMEGA, метрики, команда, API-ключи.
- Cross-Project Learning: "Хук сработал у бренда A → предлагаю для бренда B."
- Resource Allocation: дизайнер загружен 95% → предупреждение.
- Auto-Billing per Project: свой счёт, своя отчётность.
- Portfolio Dashboard: Owner видит все проекты с KPI.

---

# ═══════════════════════════════════════
# ВОЛНА 6: FUTURE VISION
# (12+ месяцев)
# ═══════════════════════════════════════

## 6.1 Self-Healing Infrastructure
**Файлы:** `backend/services/selfHealing.js`

**Что делать:**
- OMEGA сама перезапускает упавший сервис.
- Чистит кэш, меняет fallback-провайдера.
- Мониторинг uptime, авто-алерты.
- Без участия человека (кроме критических случаев).

## 6.2 Gamified Predictions (Споры с OMEGA)
**Файлы:** `frontend/src/components/OMEGAPrediction.jsx`

**Что делать:**
- OMEGA: "Предсказываю 50K просмотров. Спорим?"
- Если права → клиент получает кредиты.
- Если нет → скидка 20%.
- Leaderboard точности OMEGA.

## 6.3 AI vs Human Challenge
**Файлы:** `frontend/src/pages/owner/AIvsHuman.jsx`

**Что делать:**
- Еженедельно: OMEGA создаёт пост, человек — пост.
- Аудитория голосует.
- OMEGA побеждает → PR, вирусность.

## 6.4 OMEGA Fleet / Boardroom
**Файлы:** `frontend/src/pages/owner/FleetDashboard.jsx`

**Что делать:**
- Управление несколькими проектами одновременно.
- Boardroom: сводный дашборд всех проектов с KPI.
- Emergency Stop для всего Fleet.

## 6.5 Business Spawning
**Файлы:** `backend/services/businessSpawner.js`

**Что делать:**
- OMEGA сама создаёт новый стартап/проект за 48 часов.
- Landing, описание, тарифы, первые посты, домен, email.
- Полная автоматизация запуска.

## 6.6 Template Evolution & A/B Auto-Learning
**Файлы:** `backend/services/templateEvolution.js`

**Что делать:**
- OMEGA видит: хук A (CTR 12%) → в золотую базу, хук B (CTR 3%) → архив.
- A/B Auto-Learning: OMEGA сама предлагает вариант B → собирает статистику → обновляет рекомендации всем клиентам.
- Niche Intelligence: локальные модели под регион/нишу.
- Client Whisperer: предсказание оттока + персональный бонус ДО отписки.

---

# ═══════════════════════════════════════
# ПРИОРИТЕТЫ ИСПОЛНЕНИЯ (итоговая очередь)
# ═══════════════════════════════════════

## СРОЧНО (Pre-Launch, параллельно P9–P11):
1. Performance & Infrastructure (Волна 0)
   1.1 Code Splitting + Lazy Loading
   1.2 React Query / SWR
   1.3 Virtual Scrolling
   1.4 MongoDB индексы
   1.5 Redis (кэш + сессии)
   1.6 CDN + Image Optimization
   1.7 Bundle Size Monitoring
   1.8 Socket.io (Real-Time)
2. Waitlist с геймификацией
3. Viral Demo Generator
4. Founding Member Program
5. Public Roadmap + Голосование
6. Beta Slots Scarcity

## ВАЖНО (0–2 мес после релиза):
7. "Сделано в OMEGA" Watermark
8. Referral Program 2.0
9. Viral Leaderboard
10. OMEGA Challenge
11. Case Study Auto-Generator
12. Anti-Fail Mode доработка (HF, Pollinations, кэш)
13. OMEGA запоминает язык

## МОНЕТИЗАЦИЯ (2–4 мес):
13. Pay-per-Generation
14. Revenue Share на рекламе
15. Data Intelligence Reports
16. White-Label Agency
17. OMEGA Consulting

## АВТОНОМНОСТЬ (4–8 мес):
18. OMEGA AutoPilot
19. Predictive Engine / Viral Score 2.0
20. Brand Voice Training
21. Content Repurposing Pipeline
22. Real-Time Trend Detection
23. Organic → Paid Pipeline
24. Approval Workflows
25. Competitive Intelligence
26. Swarm Intelligence
27. Emotional AI
28. Dream Mode
29. Neuro-Sales
30. Legal & Compliance Shield
31. Dynamic Pricing AI
32. Voice + Multimodal

## ЭКОСИСТЕМА (8–12 мес):
33. OMEGA API (B2B2B)
34. WhatsApp Business API
35. Slack/Discord/Notion/ClickUp/Shopify
36. Physical World Bridge
37. Auto-Franchise Generator
38. Multi-Project Workspaces

## МОБИЛЬНОСТЬ (0–3 мес, параллельно):
45. PWA (manifest, Service Worker, Push, Offline)
46. Capacitor (APK/IPA из React)
47. Mobile-First UI (Bottom Nav, Swipe, Pull-to-refresh)

## OWNER APP (3–6 мес):
48. Command Center (все проекты в одном окне)
49. Team Pulse (real-time KPI)
50. Approval Stream (Tinder-style)
51. OMEGA Voice (голосовое управление)
52. Reports & PDF (Morning Brief)
53. Emergency Stop (mobile)

## DESKTOP (6–12 мес):
54. Tauri Desktop App (<5MB)
55. Tray & Hotkeys
56. Desktop-Only: PiP, Always on Top, Drag & Drop

## БУДУЩЕЕ (12+ мес):
57. Self-Healing Infrastructure
58. Gamified Predictions
59. AI vs Human Challenge
60. OMEGA Fleet / Boardroom
61. Business Spawning
62. Template Evolution & A/B Auto-Learning

---

# ПРАВИЛА ДЛЯ KIMI CODE

1. Читать этот файл ПОСЛЕ завершения P11.
2. Исполнять по порядку: Волна 1 → Волна 2 → Волна 3 и т.д.
3. Внутри волны — по номерам пунктов.
4. Один файл за раз. Diff. Apply. Ждать "Дальше".
5. Обновлять `PROGRESS_REPORT.md` после каждого пункта.
6. Если MongoDB пустая — запустить `backend/scripts/seed.js`.
7. Не пересоздавать существующие файлы — только дорабатывать.
8. Backend и Frontend менять синхронно.
9. ES modules (`"type": "module"`).
10. `npm run build` после каждого этапа.

---

# КЛЮЧИ API (для справки, уже в seed.js)

- Groq: `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`
- OpenRouter: `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`
- YouTube: `AIzaSyD1SH9WizR4zgi7JUshXfTuzHsJagmu4zU`
- GitHub Models: токен из настроек
- Hugging Face: бесплатный на `huggingface.co/settings/tokens`
- Fireworks AI: бесплатный tier
- Pollinations.ai: без ключа
- ElevenLabs: для Voice (приобрести позже)
- HeyGen / Runway: для Video (приобрести позже)

---

# КОНТАКТЫ И РЕСУРСЫ

- Hugging Face Token: https://huggingface.co/settings/tokens
- Fireworks AI: https://fireworks.ai
- Pollinations: https://text.pollinations.ai
- ElevenLabs: https://elevenlabs.io
- HeyGen: https://heygen.com
- Runway: https://runwayml.com

---

**Файл создан:** 2026-07-29  
**Версия:** 2.0 — Master Roadmap (Performance + Mobile + Owner App + Desktop)  
**Следующее обновление:** По мере исполнения
