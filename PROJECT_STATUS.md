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
