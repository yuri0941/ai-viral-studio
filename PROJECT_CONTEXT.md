# PROJECT CONTEXT — AI Viral Studio (kilo2)
# ⚠️ Kimi VS Code: прочитай этот файл ПЕРЕД любой задачей. Это единый источник правды.
# Дата контекста: 2026-08-05 | Версия проекта: v5.9+

---

## 1. ТЕХНИЧЕСКИЙ СТЕК

### Frontend
- React 18 + Vite (build tool)
- Tailwind CSS 3.4 + CSS-переменные (globals.css v3 luxury)
- React Router v6 (future-флаги: v7_startTransition, v7_relativeSplatPath)
- i18next + react-i18next (RU/EN, ключи в ru.json / en.json)
- Recharts (графики)
- Framer Motion (анимации)
- @tanstack/react-query (кэширование)
- @tanstack/react-virtual (VirtualTable)
- Socket.io-client (real-time)
- Web Speech API (голосовой ввод)
- jszip + file-saver (ZIP-архивы)
- pdfkit (PDF на бэкенде)
- Capacitor (Android/iOS), Tauri (Desktop)

### Backend
- Node.js + Express (ES modules, `"type": "module"`)
- MongoDB + Mongoose (Atlas / локально)
- JWT (auth), bcrypt (пароли)
- Socket.io (real-time комнаты: user_{id}, owner_{id}, team_{id})
- web-push (PUSH-уведомления, VAPID)
- Nodemailer (email, SMTP-фолбэк на лог)
- node-telegram-bot-api (два бота: ownerBot + omegaBot, polling, singleton guard)
- ioredis + in-memory fallback (кэш)

### AI / OMEGA
- 11 провайдеров fallback-цепочки:
  1. Groq (llama-3.3-70b-versatile)
  2. OpenRouter (meta-llama/llama-3.3-70b-instruct)
  3. GitHub Models
  4. HuggingFace (Llama-3.2-3B / Mistral-7B)
  5. Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)
  6. Fireworks AI
  7. Mistral
  8. Cohere
  9. DeepSeek
  10. Together
  11. Cerebras
  12. Pollinations.ai (анонимный GET, prompt ≤1500 символов, fallback последний)
- Smart Demo Mode (RU-шаблоны, без фразы «демо-режим»)
- In-memory кэш AI-ответов (TTL 1 час)
- Chroma Cloud / In-memory Vector Store (RAG, лимит 1000)
- OMEGA Core: 8 слоёв памяти, neural graph, context engine, privacy firewall, omegaGuard
- OMEGA Autonomy: Swarm Director, Dream Mode (02:00–06:00), OmegaCoder (CommonJS only!)
- Self-Reflection, Self-Healing, Crisis Management

### Платежи
- ЮKassa (основной, RUB)
- Stripe (USD/EUR, выключен по умолчанию)
- PayPal (REST API)
- Крипто (заглушка)
- Pay-per-Generation (квоты: Creator 100, Pro 500, Agency 5000)

### Деплой
- Backend: Render (aiviral-backend.onrender.com)
- Frontend: Cloudflare Pages (ai-viral-studio.pages.dev)
- GitHub: main branch
- CORS: localhost:3000/5173, *.pages.dev, FRONTEND_URL env

---

## 2. АРХИТЕКТУРА ПАПОК

```
/frontend
  /src
    /components
      /layout — AppSidebar, DashboardShell, DashboardHeader, SidebarDock
      /shared — Modal, ToastContainer, EmptyState, LoadingSkeleton, VirtualTable, ErrorBoundary
      /omega — OmegaChat, OmegaChatWidget, OmegaPanel, OmegaStatusBar, CodeInterpreter, VisionUploader
      /chat — ClientChatWidget
      /creative-hub — CreativeHub
      /documents — LuxuryDocumentViewer
      /analytics — ChannelAnalyticsTab, AudienceInsightsTab, CaseStudyGenerator, ReportGenerator
      /scheduler — VisualCalendar, PostPreview, BestTimePicker, ABTestModal
      /pwa — PWAInstallButton
    /pages
      /owner — OwnerDashboardPage, BusinessSpawnerPage, BoardroomPage, OwnerAppPage
      /owner/components/tabs — OverviewTab, FinanceTab, SubscriptionsTab, ApiKeysTab,
        OMEGACoreTab, TasksTab, ChatTab, AnalyticsTab, ContentAnalyzerPage,
        SchedulerPage, OmegaSkillsTab, OmegaMemoryTab, OmegaFinanceTab,
        TemplatesTab, BrandVoiceTab, ScoutTab, NotificationsTab, HelpTab,
        FeedbackTab, DevStudioTab, LegalSettingsTab, OwnerRequisitesTab,
        WhiteLabelTab, WorkspacesTab, DeveloperTab, ReferralsTab,
        SelfHealingCrisisTab, QRPrintTab, FranchiseTab, FleetTab
      /owner/components/modals — AddTaskModal, AddAPIKeyModal, CreateAgentModal,
        SendEmailModal, OmegaApprovalModal
      /landing — LandingPage, WaitlistSection, ViralDemo, PublicRoadmap, BetaCounter
      /legal — LegalPage (Privacy, Terms, Consent, GDPR)
      /settings — SettingsPage
      /auth — LoginForm, RegisterForm, AuthModal
      CreatorDashboardPage, AdvertiserDashboardPage, AdminDashboardPage,
      StaffDashboardPage, ContentAnalyzerPage, SchedulerPage, AIvsHumanPage,
      LaunchPage, OnboardingWizard,
      CreativeHubPage, DocumentPage
    /hooks — useOmega, useOmegaChat, useOmegaMemory, useTheme, useSocket, useCapacitor, useDashboardData
    /services — api.js (ownerApi, omegaApi, subscriptionsApi, invoicesApi, yookassaApi, stripeApi, paypalApi, emailApi, selfImprovementApi, monitoringApi, workspaceApi, whiteLabelApi, developerApi, referralApi, gamificationApi, caseStudyApi, reportApi, predictionApi, abTestApi, channelAnalyticsApi, audienceApi, vectorStoreApi, usageQuotaApi, webhookApi, integrationApi, pushApi)
    /ai/omega — omegaCore.js, omegaMemory.js, omegaSkills.js, omegaTools.js, omegaAutonomy.js, omegaLearning.js, omegaCommunication.js
    /locales — ru.json, en.json
    /styles — globals.css (v3 luxury), animations.css, luxury.css
    /config — config.js (API_BASE_URL, APP_URL), plans.js
    App.jsx, main.jsx, i18n/index.js
  /public — icons 192/512, manifest.json, offline.html, sounds/*.mp3
  /android — Capacitor
  capacitor.config.json

/backend
  /ai/omega — omegaCore.js, index.js, omegaMemory.js, omegaSkills.js, omegaTools.js,
    omegaAutonomy.js, omegaLearning.js, omegaCommunication.js, responseSelector.js,
    contextEngine.js, privacyFirewall.js, neuralGraph.js, selfReflection.js,
    omegaGuard.js, codeInterpreter.js, visionCore.js, webSearch.js, templateEvolution.js,
    abAutoLearning.js, churnPrediction.js, nicheIntelligence.js, boardroom.js,
    businessSpawner.js, watermarkService.js, dataIntelligenceService.js,
    omegaCoder.js, sandbox.js, dreamMode.js, /swarm/director.js
  /config — env.js, database.js, redis.js, plans.js
  /controllers — ownerController, omegaController, authController, userController,
    subscriptionController, invoiceController, ownerRequisitesController,
    yookassaController, stripeController, paypalController, emailController,
    pushController, omegaAPIController, whiteLabelController, projectWorkspaceController,
    aiProviderController, paymentController, adRequestController, launchController,
    gamificationController, selfImprovementController, monitoringController,
    caseStudyController, reportController, analyticsController, vectorStoreController,
    usageQuotaController, webhookController, integrationController, bookingController,
    qrController, printController, franchiseController, fleetController, deliveryController
  /data — ownerMockData.js, omegaTemplates.json (50+ шаблонов)
  /middleware — protect, rateLimiter, checkConsent, detectWhiteLabel, errorHandler
  /models — User, Subscription, Invoice, OwnerRequisites, OwnerLegalInfo, Payment,
    Campaign, SubscriptionPlan, AuditLog, Server, Integration, AIAgent, Promo, News,
    ChatMessage, Banner, AdRequest, Notification, OmegaMemory, OmegaSkill, OmegaTransaction,
    ApiKey, AIProviderSetting, PaymentProvider, ScheduledPost, Referral, PredictionStats,
    AiVsHumanRound, WhiteLabel, DeveloperApiKey, ProjectWorkspace, Webhook, QRCode,
    PrintOrder, FranchiseKit, BookingRequest, StudioPartner, CrisisEvent, UsageQuota,
    Waitlist, RoadmapVote, Challenge, CaseStudy, Report, VectorMemory
  /routes — owner.js, omega.js, auth.js, users.js, subscriptions.js, invoices.js,
    ownerRequisites.js, ownerLegalInfo.js, yookassa.js, stripe.js, paypal.js,
    email.js, push.js, payments.js, adRequests.js, launch.js, roadmap.js, demo.js,
    gamification.js, selfImprovement.js, monitoring.js, analytics.js, projectWorkspace.js,
    whiteLabel.js, /api/v1/omegaAPI.js, aiProviders.js, webhooks.js, integrations.js,
    bookings.js, qr.js, print.js, franchise.js, fleet.js, delivery.js, admin.js, fallbackRoutes.js
  /scripts — seed.js
  /services — aiService.js (ГЛАВНЫЙ AI-шлюз), emailService.js, yookassaService.js,
    stripeService.js, paypalService.js, vectorizeService.js, vectorStore.js,
    trendScanner.js, bestTimeService.js, imageGeneration.js, brandVoice.js,
    templatesLibrary.js, autoPilot.js, selfHealing.js, youtubeAI.js, webSearch.js,
    sentimentAnalysis.js, crisisDetection.js, predictionGame.js, aiVsHuman.js,
    leaderboardService.js, revenueShareService.js, referralService.js, usageQuotaService.js,
    pdfGenerator.js, caseStudyGenerator.js, dataIntelligenceService.js, printService.js,
    bookingService.js, deliveryService.js, franchiseGenerator.js, qrService.js,
    ownerBot.js, omegaBotService.js, rollbarService.js
  server.js
  .env.example
```

---

## 3. РОЛИ ПОЛЬЗОВАТЕЛЕЙ (критично — проверять ВСЕГДА)

| Роль | Доступ | Что видит OMEGA | Команды |
|------|--------|-----------------|---------|
| **owner** | Полный доступ, все табы, финансы, команда, OMEGA Core, Emergency Stop, API Keys, реквизиты, white-label, workspaces, fleet, franchise | Все данные, MRR, метрики, /exec, /status, /stats, /feature, /alert, /stop | /exec, /status, /stats, /feature, /alert, /stop + общие |
| **admin** | Пользователи, модерация, настройки платформы, быстрые настройки | Пользователи, жалобы, настройки | /users, /moderate + общие |
| **staff** | Тикеты, Kanban, база знаний, чат с командой | Тикеты, KB | /ticket, /kb + общие |
| **advertiser** | Кампании, AdStudio, креативы, аналитика, переговоры | Кампании, CTR, бюджет | /campaign, /creative + общие |
| **creator** | Посты, портфолио, аналитика, AI Chat, планировщик | Посты, вирусность, доход | /post, /hook, /analyze, /cover, /plan + creator suggestions |
| **business** | Аналог creator + бизнес-спавнер | Бизнес-метрики | Как creator |
| **client** (гость→после регистрации) | Лендинг, свой профиль, подписки, чат с поддержкой, заявки на рекламу | Только свои данные, общие команды | Только общие команды |

**Правило:** При регистрации role всегда = 'creator'. Owner/admin/staff назначаются вручную или через seed.
**Правило:** Privacy Firewall блокирует MRR/инфраструктуру для не-owner ролей.
**Правило:** Context Engine подписывает роль в system prompt и фильтрует данные по ACCESS_MATRIX.

---

## 4. ДИЗАЙН-СИСТЕМА (Luxury v5.6+)

### CSS-переменные (globals.css v3)
```css
:root (light): --bg #f8f7f4, --bg-secondary #ffffff, --card #ffffff, --card-hover #f5f5f5,
  --text #1a1a2e, --text-muted #6b7280, --border #e5e7eb, --glass rgba(255,255,255,0.7),
  --primary #8B5CF6, --primary-soft rgba(139,92,246,0.1), --accent #00ff41, --accent2 #06B6D4, --accent3 #F97316
.dark: --bg #0a0a1f, --bg-secondary #12121f, --card #1a1a2e, --card-hover #252538,
  --text #f1f1f4, --text-muted #9ca3af, --border rgba(255,255,255,0.08), --glass rgba(10,10,31,0.7)
```

### Шрифты
- Inter (основной), JetBrains Mono (код/моно), serif (editorial hero)

### Эффекты
- Glassmorphism: `backdrop-blur(20px) saturate(180%)`, `bg-[var(--glass)]`, `border-white/10`
- Liquid Glass: `backdrop-blur(12px) bg-white/5 border border-white/10`
- Neon Glow: `shadow-[0_0_20px_rgba(139,92,246,0.3)]`
- Magnetic Buttons: hover `scale-[1.02]`, active `scale-[0.98]`
- 3D Tilt: `transform-style: preserve-3d`, `hover:rotate-x-2`
- Shimmer: `animate-shimmer` (градиентная полоска)
- Pulse Glow: `animate-pulse-glow`

### Адаптив (mobile-first)
- Breakpoints: xs:475px, sm:640px, md:768px, lg:1024px, xl:1280px
- Touch targets: минимум 44×44px
- Sidebar: macOS Dock style desktop, drawer (<1024px) со swipe-to-close
- Bottom nav: 5 табов на mobile (Owner App)
- Safe-area: `env(safe-area-inset-*)`
- Tables: `overflow-x-auto`, min-width ячеек
- Modals: `max-w-[95vw]`, `max-h-[90vh]`, `overflow-y-auto`
- Blur на mobile: `blur(8px)` (не 20px, для производительности)

---

## 5. КРИТИЧЕСКИЕ ПРАВИЛА КОДА (Kimi VS Code — соблюдать ЖЕСТКО)

### Frontend
1. **Mobile-first** — всегда пиши base → sm → md → lg → xl
2. **CSS-переменные** — НИКОГДА не хардкодить цвета. Используй `bg-[var(--bg)]`, `text-[var(--text)]`, `border-[var(--border)]`
3. **Иконки** — ВСЕ из `lucide-react`. Проверять импорт перед использованием. Нет `BarChart3`/`BarChart` конфликтов — использовать `as` (например `BarChart as BarChartIcon`)
4. **i18n** — ВСЕ пользовательские тексты через `t('key')`. Если ключа нет — добавить в ru.json И en.json
5. **API URL** — ВСЕГДА использовать `API_BASE_URL` из `config.js`. НИКАКИХ `localhost:5000` или `/api` без базы
6. **Loading states** — Кнопки с `isLoading`, skeletons вместо спиннеров, `disabled` при загрузке
7. **Error handling** — try/catch на ВСЕ async, toast-уведомления, не красный экран смерти
8. **Null-safety** — `user?.role`, `data?.length`, `Array.isArray(arr)` перед `.map`
9. **Keys** — Уникальные `key` в `.map`. Fallback: `item.id ?? item._id ?? index` (но index только если нет id)
10. **Accessibility** — `aria-label`, `role`, keyboard navigation
11. **React Query** — `@tanstack/react-query` для server state, `staleTime: 5min`
12. **Lazy loading** — `React.lazy()` для тяжёлых страниц (Analytics, Scheduler, ContentAnalyzer)
13. **Sounds** — Проверять `localStorage.getItem('omega_sound_enabled')` перед `new Audio()`
14. **Voice** — Web Speech API с fallback `alert('Не поддерживается')`

### Backend
1. **ES modules** — `type: "module"` в package.json. Использовать `import/export`. OmegaCoder — **CommonJS** (`module.exports/require`) для sandbox!
2. **Проверка роли** — ВСЕ эндпоинты owner/admin проверять `req.user.role`. 403 если нет прав.
3. **Валидация** — Joi или ручная проверка `req.body`. Не доверять клиенту.
4. **MongoDB** — `safeFind` с fallback на mock. `connectDB()` ДО `app.listen()`.
5. **Rate limiting** — 5/час на register, 10/15мин на login. Development: 10000/15мин.
6. **CORS** — Первым middleware. `app.options('*', cors())` для preflight.
7. **AI fallback** — `chatWithAI` перебирает цепочку. При ошибке — Smart Demo Mode (RU, без слова «демо»).
8. **Telegram** — Singleton guard (`global.ownerBotStarted`). `deleteWebhook()` (camelCase) перед polling. Игнорировать 409 Conflict.
9. **Stripe webhook** — `raw({ type: 'application/json' })` ДО express.json().
10. **OmegaCoder** — `node --check` перед записью файла. Markdown stripper. System prompt: "CommonJS only, no ES6 modules, no markdown".
11. **Chroma** — try/catch на embedding. Fallback на in-memory Map (лимит 1000).
12. **Pollinations** — GET (не POST), prompt ≤1500 символов, без ключа.
13. **OpenRouter** — модель `meta-llama/llama-3.3-70b-instruct` (без `:free` суффикса).
14. **Groq** — `llama-3.3-70b-versatile` (не 3.1). Fallback chain: 3.3 → 3.1-8b → mixtral.
15. **Exports** — ВСЕ сервисы должны экспортировать используемые функции. Проверять `node --check`.
16. **Redis** — `connectRedis()` после MongoDB. Fallback in-memory Map с TTL.

---

## 6. КЛЮЧЕВЫЕ API ENDPOINTS

### Auth
- POST `/api/auth/register` — body: {name, email, password, timezone, turnstileToken, preferences}
- POST `/api/auth/login` — body: {email, password, timezone, turnstileToken}
- GET `/api/auth/me` — Bearer token
- POST `/api/auth/forgot-password`, `/api/auth/reset-password/:token`
- GET `/api/auth/verify-email/:token`

### OMEGA
- POST `/api/omega/chat` — body: {message, history, language, userRole}
- GET `/api/omega/status`
- POST `/api/omega/command` — body: {command, userRole}
- GET `/api/omega/templates`
- POST `/api/omega/templates/:id/generate`
- POST `/api/omega/generate-cover`
- GET `/api/omega/best-time`
- GET `/api/omega/scout/trends`
- POST `/api/omega/brand-voice/analyze`
- POST `/api/omega/brand-voice/toggle`
- POST `/api/omega/autopilot/toggle`
- POST `/api/omega/predictions/recalculate`
- POST `/api/omega/repurposing/enable`
- POST `/api/omega/voice/enable`

### Owner
- GET `/api/owner/overview`, `/finance`, `/team`, `/servers`, `/subscriptions`, `/audit`, `/agents`, `/promos`, `/news`
- PATCH `/api/owner/subscription-plans/:planId`
- GET `/api/owner/ai-providers/status`
- POST `/api/owner/ai-providers/:id/toggle`
- PATCH `/api/owner/api-keys/:provider`

### Subscriptions / Payments
- GET `/api/subscriptions/plans`, `/current`, `/history`
- POST `/api/subscriptions`
- PATCH `/api/subscriptions/:id`
- DELETE `/api/subscriptions/:id/cancel`
- GET `/api/subscriptions/trial-ending`
- POST `/api/yookassa/pay/subscription`, `/pay/invoice/:invoiceId`
- POST `/api/yookassa/webhook`
- POST `/api/stripe/pay/subscription`, `/pay/invoice/:invoiceId`
- POST `/api/stripe/webhook`
- POST `/api/paypal/create-order`, `/capture`

### Invoices / Requisites
- GET `/api/invoices`, `/:id`
- POST `/api/invoices`
- PATCH `/api/invoices/:id`
- POST `/api/invoices/:id/pay`
- GET `/api/owner-requisites`
- POST `/api/owner-requisites`

### Analytics
- GET `/api/analytics/channels`, `/channels/:platform`
- GET `/api/analytics/audience`, `/audience/:platform`
- POST `/api/analytics/ab-test`
- POST `/api/analytics/reports/generate`
- GET `/api/analytics/case-studies/candidates`
- POST `/api/analytics/case-studies/generate`
- GET `/api/analytics/vector-store/status`
- DELETE `/api/analytics/vector-store/clear`

### Gamification / Growth
- GET `/api/gamification/predictions/accuracy`
- POST `/api/gamification/predictions/:id/wager`
- GET `/api/gamification/aivshuman/archive`, `/stats`
- POST `/api/gamification/aivshuman/vote`
- GET `/api/gamification/leaderboard`
- GET `/api/challenges/*`

### Monitoring / Self-Healing
- GET `/api/monitoring/self-healing`
- PUT `/api/monitoring/self-healing/auto-heal`
- GET `/api/monitoring/crises`
- POST `/api/monitoring/crises/analyze`
- GET `/api/monitoring/self-reflection`

### Integrations
- POST `/api/integrations/whatsapp/send`, `/webhook`
- POST `/api/integrations/notion/page`
- GET `/api/integrations/shopify/products`
- GET `/api/integrations/webhooks`

### Public
- GET `/api/public/legal-info` — динамические legal-страницы
- GET `/api/health` — UptimeRobot

---

## 7. МОДЕЛИ MONGOOSE (ключевые поля)

### User
```js
{ name, email, password, role: enum['owner','admin','staff','advertiser','creator','business','client'],
  avatar, preferences: { theme, language, timezone, animations, sounds },
  brandVoice: { enabled, tone, style, vocabulary },
  socials: { instagram, tiktok, youtube, telegram, vk, twitter },
  acceptedTerms, acceptedPrivacy, acceptedConsent, isAdult, acceptedAt,
  watermarkSettings, referralCode, referralCount, referralEarnings,
  verificationToken, resetPasswordToken, resetPasswordExpire }
```

### Subscription
```js
{ userId, plan, status, price, currency, interval, startDate, endDate,
  trialEndsAt, autoRenew, paymentMethod, provider, providerPaymentId, isTrial, metadata }
```

### Invoice
```js
{ ownerId, clientId, subscriptionId, invoiceNumber, amount, currency, status,
  type, items: [{name,qty,price,total}], requisitesSnapshot, dueDate, paidAt, provider, paymentUrl }
```

### ScheduledPost
```js
{ userId, title, content, platforms: [], status: enum['draft','scheduled','published','error'],
  scheduledAt, publishedAt, mediaUrl, thumbnailUrl, variants, abTest, tags }
```

### AIAgent / OmegaMemory / OmegaSkill / OmegaTransaction — см. omega-архитектуру

---

## 8. TELEGRAM БОТЫ (критично — singleton)

### Owner Bot (ownerBot.js)
- Команды: /start, /status, /stats, /omega, /menu, /exec, /feature, /alert, /stop
- Owner Mode: только `TELEGRAM_OWNER_CHAT_ID`
- Singleton: `global.ownerBotStarted = true`
- `deleteWebhook()` перед polling
- Игнорировать 409 Conflict

### OMEGA Bot (omegaBotService.js)
- Owner Mode + Client Mode
- Inline keyboards, AI-ответы через `chatWithAI`
- Singleton: `global.omegaBotStarted = true`

### Telegram Bridge
- Авто-фичи, динамическое меню

---

## 9. ПРАВИЛА OMEGA CHAT (v5.9)

### UI
- Glass bubbles, orb-аватар, typing dots
- Command palette: `/` → dropdown с командами (фильтр по роли)
- Inline editing: double-click на AI-сообщение → textarea → Save/Cancel
- Message actions (hover): 📋 Copy, 📅 Schedule, 🚀 Publish, ✏️ Edit, 🗑 Delete
- Image upload: drag & drop + Paperclip, preview thumbnail
- Smart suggestions: chips после AI-ответа (ролевые + общие)
- Platform preview: 👁 → split-screen Instagram/TikTok/Telegram/YouTube
- Voice input: hold-to-record, Web Speech API, `ru-RU`
- Role badge: 👑 Owner, 🛡 Admin, 🎧 Staff, 📢 Advertiser, 🎨 Creator, 🏢 Business, 👤 Client

### Backend
- `userRole` передаётся в `chatWithAI` и `contextEngine`
- `privacyFirewall.js` блокирует MRR/инфраструктуру для не-owner
- `omegaGuard.js` — `/exec`, `/stop` только owner
- `contextEngine.js` — ROLE_INSTRUCTIONS для каждой роли

---

## 10. ЧТО УЖЕ РЕАЛИЗОВАНО (полный список — НЕ ломать)

### Инфраструктура
✅ React 18 + Vite + Tailwind + Node.js + Express + MongoDB
✅ JWT auth, rate limiting, Turnstile (временно отключён), role-based access
✅ PWA: manifest, sw.js, offline.html, push-уведомления
✅ i18n RU/EN, темы light/dark, CSS-переменные v3
✅ Socket.io real-time, Redis/in-memory cache
✅ Capacitor (Android), Tauri (Desktop), Owner App mobile
✅ VirtualTable, React Query, code splitting, Error Boundary
✅ Rollbar, Self-Healing, Crisis Management, Telegram alerts

### OMEGA
✅ 8 слоёв памяти, neural graph, context engine, privacy firewall
✅ 11 AI-провайдеров fallback, Smart Demo Mode, in-memory кэш
✅ Code Interpreter, Vision Core, Chain-of-Thought, Self-Reflection
✅ Real-time Search (SerpAPI/Reddit/Twitter fallback)
✅ Swarm Director, Dream Mode, OmegaCoder (CommonJS sandbox)
✅ 50+ шаблонов, Template Evolution, A/B Auto-Learning
✅ Brand Voice, AI-обложки, Best Time to Post
✅ OMEGA Scout (тренды), OMEGA Agents (10 штук)
✅ Churn Prediction, Niche Intelligence
✅ Voice: Whisper STT + ElevenLabs TTS + Web Speech fallback
✅ AI Video (Reels/Shorts скрипты)

### Контент
✅ ContentAnalyzer (YouTube/Shorts/TikTok/Insta/Twitter regex)
✅ Scheduler: drag-drop, Visual Calendar, Kanban, медиа-очередь
✅ Post Preview (Instagram 1:1, TikTok 9:16, YouTube 16:9, Telegram)
✅ A/B Tests, AutoPilot, Auto-publish
✅ 50 AI-шаблонов (Hooks, AIDA, PAS, Email, Shorts)

### Монетизация
✅ ЮKassa, Stripe, PayPal, Crypto
✅ Подписки: Free/Starter/Pro/Agency (2900/7900/19900 ₽)
✅ Invoices, Owner Requisites, Legal Info
✅ Pay-per-Generation, Referral 2.0, Dynamic Pricing, AI Pricing Engine
✅ Revenue Share (5% ad spend), Data Intelligence Reports

### Дашборды (все роли)
✅ Owner: 15+ табов, BentoGrid, OMEGA Core, Finance, Subscriptions, API Keys, Team, Tasks, Chat, Analytics, Legal, White-Label, Workspaces, Developer, Referrals, QR/Print, Franchise, Fleet, Self-Healing/Crisis
✅ Admin: пользователи, модерация, настройки платформы
✅ Staff: тикеты, Kanban, быстрые ответы
✅ Advertiser: AdStudio canvas, кампании, переговоры, аналитика
✅ Creator: портфолио, вирусность, монетизация, AI-нуджи
✅ Business: аналог creator + бизнес-спавнер

### Лендинг / Growth
✅ Luxury Landing Page: editorial hero, bento grid, waitlist, viral demo, roadmap
✅ Onboarding Wizard (5 шагов), OneClickPublish
✅ Viral Leaderboard, OMEGA Challenge, Watermark
✅ Cookie Consent, GDPR, Data Export, Right to be Forgotten
✅ Product Hunt Launch Kit

### Интеграции
✅ WhatsApp, Slack, Discord, Notion, ClickUp, Trello, Shopify
✅ Webhooks / Zapier / Make (HMAC подпись)
✅ VK OAuth, Telegram OAuth, Discord OAuth (реальные URL из env)

### Физический мир
✅ QR-генератор, Print (Printful-ready), Booking студий
✅ Franchise Kit (Agency-only), Fleet Management
✅ Delivery (deep link Yandex Eats)

### Геймификация
✅ Predictions (споры с OMEGA), AI vs Human
✅ Leaderboard, Achievement Widget, Streak Counter
✅ Case Study Auto-Generator

---

## 11. ЧТО СЕЙЧАС В РАБОТЕ (v5.9 — не ломать)

🔄 OmegaChat UI: command palette, inline edit, message actions, image upload, smart suggestions, platform preview, voice input, role badge
🔄 Backend: omegaMemory per role, omegaAutonomy for owner

---

## 12. ИЗВЕСТНЫЕ ПРОБЛЕМЫ / ПАТТЕРНЫ (не повторять)

1. **Импорты lucide-react** — ВСЕГДА проверять наличие иконки. `Cpu`, `Loader2`, `BarChart`/`BarChart3` — частые ошибки.
2. **Default export api.js** — Должен быть В КОНЦЕ файла, после всех named exports. Иначе TDZ.
3. **Duplicate MongoDB indexes** — Не ставить `index: true` в schema, если ниже есть `schema.index({...})`.
4. **Telegram 409** — Использовать singleton + `deleteWebhook()` + игнорировать 409.
5. **OmegaCoder JSON.parse** — Оборачивать в try-catch + regex extract code.
6. **Chroma embedding** — try-catch + fallback на пустой массив.
7. **Pollinations 402/431** — GET (не POST), prompt ≤1500.
8. **OpenRouter 404** — Модель `meta-llama/llama-3.3-70b-instruct` (без `:free`).
9. **Groq 403** — `llama-3.3-70b-versatile`, не 3.1.
10. **Stripe webhook** — `raw()` ДО `express.json()`.
11. **CORS 405** — `app.options('*', cors())` + CORS первым middleware.
12. **Timezone 400** — Отправлять `timezone` top-level в body, backend сохранять в `preferences.timezone`.
13. **Turnstile** — Временно отключён (placeholder token 'disabled').
14. **AI Keys** — Читать из MongoDB (ApiKey модель) → env → fallback.
15. **getProviderKey ObjectId** — Валидировать `ownerId` перед `new ObjectId()`.

---

## 13. ПРАВИЛА ДЛЯ KIMI VS CODE (как с тобой работать)

### Перед началом работы
1. Прочитай этот PROJECT_CONTEXT.md полностью.
2. Прочитай PROGRESS_REPORT.md (если есть в корне).
3. Определи: какая роль пользователя? Какой таб/страница? Какой API endpoint?

### Во время работы
1. **Не переписывай** существующие файлы целиком — делай точечные изменения.
2. **Не ломай** существующий функционал из раздела "Что уже реализовано".
3. **Соблюдай** дизайн-систему (CSS-переменные, glassmorphism, mobile-first).
4. **Проверяй** импорты lucide-react — иконка должна существовать.
5. **Проверяй** i18n — добавляй ключи в ru.json и en.json.
6. **Проверяй** API URL — использовать `API_BASE_URL` из config.js.
7. **Проверяй** ролевой доступ — owner/admin/staff/advertiser/creator/business/client.
8. **Backend:** `node --check` для КАЖДОГО изменённого файла.
9. **Frontend:** `npm run build` — 0 ошибок.

### После работы
1. `git add . && git commit -m "feat: ..." && git push origin main`
2. Обнови PROGRESS_REPORT.md — добавь запись в конец.
3. Сообщи пользователю: что сделано, что проверено, какие ручные действия нужны (Render env, Clear Build Cache).

---

## 14. ENVIRONMENT VARIABLES (Render — должны быть установлены)

```
# MongoDB
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=...

# AI Providers (хотя бы 1 рабочий)
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
GITHUB_API_KEY=...
HUGGINGFACE_API_KEY=...
CLOUDFLARE_API_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
FIREWORKS_API_KEY=...
MISTRAL_API_KEY=...
COHERE_API_KEY=...
DEEPSEEK_API_KEY=...
TOGETHER_API_KEY=...
CEREBRAS_API_KEY=...

# Chroma / Vector
CHROMA_API_KEY=...
CHROMA_TENANT=...
CHROMA_DATABASE=Omega1313

# Payments
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_ENABLED=false
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_OWNER_CHAT_ID=...
TELEGRAM_BOT_LINK=https://t.me/..._bot
ENABLE_TELEGRAM=true

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Push / VAPID
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...

# Redis
REDIS_URL=... (или UPSTASH_REDIS_URL)

# Frontend
FRONTEND_URL=https://ai-viral-studio.pages.dev

# OAuth
VK_CLIENT_ID=...
DISCORD_CLIENT_ID=...

# Other
PORT=10000
NODE_ENV=production
```

---

## 15. ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ (чек-лист для пользователя)

- [ ] Render: Clear Build Cache & Deploy
- [ ] Render Logs: 0 SyntaxError, 0 deprecation, 0 conflict
- [ ] `/health` → `{"status":"ok"}`
- [ ] `/api/public/legal-info` → возвращает данные
- [ ] Login → token, role=creator
- [ ] Register → token, role=creator
- [ ] OMEGA Chat → отвечает (provider в ответе)
- [ ] Privacy Firewall: клиент спрашивает MRR → 403
- [ ] Role badge: виден в OmegaChat
- [ ] i18n: "OMEGA AI", не ключи
- [ ] Mobile: drawer swipe, touch 44px, bottom nav
- [ ] Console: 0 красных ошибок
- [ ] Git push: выполнен


## Current State (v6.4 Final — 2026-08-06)

- Backend: Node.js + Express, MongoDB, все роуты созданы
- Rate Limiter: 500/15min auth, 300/15min omega/analytics/subscriptions, 50/15min guest
- Auth: protect + requireRole (401/403 разделение)
- OMEGA: Intent routing (video analysis), role-aware prompts (owner/admin/staff/client/creator/advertiser/guest), strip duplicate greetings
- Integrations: VK, IG, TikTok, LinkedIn, YouTube, Pinterest, FB, Twitter, Discord — все с try-catch graceful fallback
- VK: frontend axios interceptor с Bearer token
- Payments: Stripe silent guard + lazy init, YooKassa 503 graceful error
- Telegram: webhook mode (polling удалён), ownerBot.js полностью реализован (8 команд, Owner Mode, inline keyboards)
- Telegram: deleteWebhook camelCase, 409 conflict guard
- Frontend: React + Tailwind, Creative Hub unified (1 sidebar item), glassmorphism UI
- Chat: единый компонент везде (Hub + Widget + Profile), логотип в шапке, нет дублей, gradient bubbles
- UI: LuxuryMessageCard для анализа видео, action buttons под ответами, glassmorphism dashboards всех ролей
- Roles: owner, admin, staff, client, creator, advertiser — OMEGA адаптирует приветствие
- Header: dropdown fixed z-[9999], не обрезается
- Components: LuxuryDocumentViewer, CreativeHub, unified OmegaChat
- API Interceptor: HTML→JSON fallback, retry 429, 502/503 fallback, Bearer Authorization
- PWA: Cache bust `v6.4-force-2`, `skipWaiting`, auto-reload on update, `main.jsx` force update
- Mobile: OmegaChat FAB bottom-20 56px, bottom sheet 85vh, drag handle, safe-area-inset
- Graceful degradation: OmegaMemoryTab, FinanceTab, SubscriptionsTab, TemplatesTab, UsageQuotaWidget
- Seed: backend/scripts/seedUsers.js — все роли
- Automation: run.sh, run.bat, .vscode/tasks.json

## Known Issues (resolved)

- [x] 429 Too Many Requests
- [x] 404 Missing endpoints
- [x] 502/503 Integrations
- [x] 401/403 Auth confusion
- [x] HTML instead of JSON
- [x] Passive event listener
- [x] Push atob error
- [x] Telegram deleteWebhook camelCase
- [x] Telegram 409 conflict
- [x] Stripe error spam + popup
- [x] Zap/KeyRound ReferenceError
- [x] OMEGA duplicate in messages
- [x] Header dropdown overflow
- [x] 3 separate tabs → 1 Creative Hub
- [x] 2 chat versions → unified chat
- [x] Role-aware greeting
