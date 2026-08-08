# AI Viral Studio — Project Status

> Last updated: 2026-08-03
> Status: release candidate v4.0

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, TanStack Query, Capacitor, Tauri
- **Backend**: Node.js, Express, MongoDB (Mongoose), Redis/Upstash (optional), Web Push
- **AI / OMEGA**: Groq, OpenRouter, Cloudflare Workers AI, GitHub Models, HuggingFace, Pollinations fallback
- **Payments**: ЮKassa, Stripe, PayPal, Coinbase Commerce
- **Notifications**: Web Push (VAPID), Telegram bots

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
npm run build:mobile   # build + Capacitor sync
npx cap sync       # sync Capacitor native projects
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in real API keys, then:
npm run dev        # nodemon / node server.js
node server.js     # production start
```

## Required / Optional Environment Variables

See `backend/.env.example` for the full template. Key variables:

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `PORT` | server port | no (default 10000) |
| `NODE_ENV` | development / production | no |
| `MONGO_URI` / `MONGODB_URI` | MongoDB connection | yes |
| `JWT_SECRET` | JWT signing secret | yes |
| `FRONTEND_URL` | CORS / redirect origin | yes |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (auth) | recommended |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push | recommended |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_OWNER_CHAT_ID` | Owner alerts | optional |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` / ... | AI providers | at least one |
| `STRIPE_SECRET_KEY` / `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Payments | optional |
| `REPLICATE_API_KEY` / `REPLICATE_API_TOKEN` | AI video / image | optional |
| `ELEVENLABS_API_KEY` / `OPENAI_API_KEY` | Voice TTS / STT | optional |
| `SERPAPI_KEY` / `REDDIT_CLIENT_ID` / `TWITTER_BEARER_TOKEN` | Web search | optional |
| `CHROMA_*` / `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_KEY` | Vector store / RAG | optional |

## Feature Highlights (v4.0)

- **OMEGA Core**: multi-layer memory, neural graph, context engine, privacy firewall, OmegaGuard (422-FZ / GDPR), self-reflection, chain-of-thought.
- **AI Chat**: provider fallback chain, usage quotas, voice input/output, vision, code interpreter, real-time web search.
- **Content Studio**: content analyzer, 50+ templates, AI covers, scheduler with visual calendar, drag-drop, one-click publish.
- **Video & Voice**: AI Shorts/Reels scripts, AI video generation placeholder pipeline, Whisper STT, ElevenLabs TTS.
- **Monetization**: subscriptions, Pay-per-Generation, dynamic pricing, referral 2.0, revenue share on ad spend.
- **Advertiser**: ad studio canvas, campaigns, analytics, revenue-share dashboard.
- **Growth**: "Made in OMEGA" watermark, viral leaderboard, monthly OMEGA Challenge, data intelligence reports.
- **Business tools**: QR generator, print-on-demand, franchise kits, booking, delivery, fleet.
- **Integrations**: WhatsApp, Slack, Discord, Notion, ClickUp, Trello, Shopify, webhooks.
- **Mobile & Desktop**: Capacitor (iOS/Android), Tauri desktop, PWA with offline mode, push notifications.
- **Self-healing**: provider fallback, monitoring, Telegram crisis alerts, auto-recovery.

## Build Checklist

- `cd frontend && npm run build` — 0 errors.
- `cd backend && find . -name "*.js" -exec node --check {} \;` — 0 errors.
- `npx cap sync` — successful.

## Deployment

- **Backend**: Render (clear build cache & deploy).
- **Frontend**: Cloudflare Pages from `frontend/dist`.
- **PWA**: `vite-plugin-pwa` generates `sw.js` and `manifest.json` automatically.

## Next Steps (v5.0)

- Fine-tune OMEGA on platform data (100K+ dialogs).
- Full AI video generation (Pictory / HeyGen integration).
- 3D OMEGA avatars.
- Optional blockchain / NFT integration.

## v9.9.2-MASTER-FIX Update (2026-08-08)

### New Features
- **Trial Tokens**: 10 free AI generations for new users via UsageQuota model, visible counter in OmegaChat header.
- **Smart Quota**: Help/info/navigation queries bypass token consumption.
- **Niche Recognition**: Fuzzy registry of 20+ niches + AI fallback, endpoint `POST /api/omega/detect-niche`.
- **Unified Support**: SupportTicket model, AI-first triage with confidence scoring, escalation to owner when confidence < 0.7.
- **SupportTab**: Owner dashboard panel for support tickets (filter, search, reply, status change).
- **SupportWidget**: Global floating support button with screenshot upload and Telegram link.
- **Telegram Client Bot** `@aiviral_omega_bot`: client menu, support flow, ticket creation.
- **Telegram Owner Bot** `@aiviral_alerts_bot`: `/tickets` command and owner alerts.
- **Feature Map**: 6-card bento feature section on landing page.
- **Interactive Tutorial**: driver.js 5-step onboarding tour in OmegaChat.

### Updated Environment Variables
- `TELEGRAM_BOT_TOKEN` — client bot `@aiviral_omega_bot`
- `TELEGRAM_OWNER_BOT_TOKEN` — owner bot `@aiviral_alerts_bot`
- `TELEGRAM_OWNER_CHAT_ID` — owner chat for alerts

## v9.9.5-TELEGRAM-UNIFIED Update (2026-08-08)

### Architecture
- **Channel**: `@aiviralstudio` — publication target.
- **Client Bot**: `@aiviral_omega_bot` — luxury menu (ads, discounts, video, support, orders, pricing, app link).
- **Owner Bot**: `@aiviral_alerts_bot` — owner panel (tickets, ad orders, prices, stats, publish, stop/start, dashboard link) for `@Tvinki013` (ID 2130452126).

### New Backend
- **Models**: `ChannelConfig`, `AdOrder`, `DiscountPost`.
- **Services**: `channelContentEngine.js`, `channelPublisher.js`, `discountService.js`, `videoPromoService.js`, `adPricingService.js`.
- **Routes**: `GET/POST/PATCH /api/channel/*`, `GET/POST/PATCH /api/ad-orders/*`, `GET/POST /api/discounts/*`.
- **Cron**: hourly auto-posts, every-3-days discounts at 12:00, Saturday videos at 11:00, 09:00 owner briefing.

### New Frontend
- **ChannelManagerTab**: channel list, add channel, publish now, stats, pause/start.
- **AdOrdersTab**: orders table, approve/reject, pricing editor, discount creator, video topic button.
- **SupportWidget**: floating 💬 button, support ticket modal, Telegram link fallback.

### Build Status
- `npm run build` — 0 errors (PWA cache limit raised to 5 MiB).
- `node --check backend/server.js` — OK.

### Deployment
- Backend: Render (clear build cache & deploy).
- Frontend: Cloudflare Pages from `frontend/dist`.

## v9.9.7-BOT-CONVERSATION Update (2026-08-09)

### New Features
- **OmegaBot AI Dialog**: free-text AI replies with context memory (last 10 messages) instead of only buttons.
- **Privacy Firewall**: 5 regex patterns block owner / revenue / stack / other clients / secrets from client replies.
- **Smart Routing**: AI detects intent (ads, discounts, video, support) and offers inline action buttons.
- **Auto-Escalation**: unknown / payment / bug / account issues create a support ticket and alert the owner.
- **Ticket Inline Actions**: 👍 resolves ticket, 👎 escalates to owner with Telegram + Dashboard alert.
- **OwnerBot Conversations**: new `💬 Диалоги` button lists `needs_owner` / `open` / `ai_handled` Telegram tickets.
- **TicketsTab Source Badge**: each ticket shows `💬 Диалог` / `📱 TG` / `🌐 Web` source.

### Updated Backend
- `backend/services/omegaBot.js`: `handleFreeText`, `CLIENT_PRIVACY_PATTERNS`, `global.clientDialogues`.
- `backend/services/supportService.js`: exported `updateTicketStatus`.
- `backend/routes/support.js`: `PATCH /:id/status` now uses `updateTicketStatus`.

### Build Status
- `npm run build` — 0 errors.
- `node --check backend/server.js` — OK.

## v9.9.8-SALES-OMEGA Update (2026-08-09)

### New Features
- **Sales Script Engine**: every OMEGA reply ends with a CTA (demo, plan, case study).
- **Personality Evolution**: OMEGA adapts tone (`formal`, `casual`, `ironic`, `technical`, `emotional`) to the client.
- **Dialogue Learning**: client dialogues are saved to `ClientDialogue` + Vector Store for RAG-based learning.
- **Churn Guard**: patterns like "delete account / cancel" trigger instant `OMEGACHURN30` offer + urgent ticket.
- **Cross-sell / Up-sell**: Free→Pro and Pro→Agency suggestions based on detected intent.
- **Retention Engine**: cron every 3 days re-engages clients inactive for 3+ days.
- **Sales Metrics API**: `GET /api/admin/sales-metrics` returns conversion rate, top intents, 7-day dynamics.
- **Sales Metrics Tab**: `SalesMetricsTab.jsx` with 4 summary cards, BarChart and PieChart.
- **Owner Sidebar**: new "Метрики продаж" menu item.

### New Backend Files
- `backend/models/ClientDialogue.js`
- `backend/services/dialogueLearningService.js`
- `backend/services/retentionEngine.js`
- `backend/routes/salesMetrics.js`

### Updated Backend
- `backend/services/omegaBot.js`: `detectIntent`, `detectClientTone`, `findSimilarSuccess`, sales system prompt, Churn Guard.
- `backend/server.js`: retention cron, `/api/admin/sales-metrics` route.

### Build Status
- `npm run build` — 0 errors.
- `node --check backend/server.js` — OK.

## v9.9.9-CHAT-UNIFIED Update (2026-08-09)

### New Features
- **Unified OMEGA Chat**: support ticket form is now embedded inside the chat window via the `💬 Поддержка` quick action.
- **Draggable Chat Widget**: `OmegaChatWidget.jsx` rewritten — drag header to move, position persisted in `localStorage`, minimize/maximize/close controls.
- **Adaptive Chat**: mobile `clamp(320px, 90vw, 420px)` / desktop fixed draggable floating window.

### Fixes
- **Duplicate Icons**: quick actions deduplicated by `id`; added `UNIQUE_ACTION_BUTTONS` guard.
- **Landing CTA**: `Начать` remains primary gradient CTA, `Войти` restyled as ghost/outline button, both in a single row.
- **Removed SupportWidget**: deleted from `App.jsx` to avoid duplicating the chat-integrated support flow.

### Updated Files
- `frontend/src/components/omega/OmegaChat.jsx`: support mode, ticket form, `embedded` prop, unique quick actions.
- `frontend/src/components/omega/OmegaChatWidget.jsx`: fully rewritten draggable widget.
- `frontend/src/pages/LandingPage.jsx`: hero CTA buttons restyled.
- `frontend/src/App.jsx`: removed `<SupportWidget />`.
- `frontend/src/locales/ru.json` & `frontend/src/i18n/locales/ru.json`: new `chat` and `landing` keys.

### Build Status
- `npm run build` — 0 errors.
- `node --check backend/server.js` — OK.
