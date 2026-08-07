# Owner Guide — AI Viral Studio

## Dashboard Overview

As an owner, you have access to the full command center:
- **Overview**: revenue, subscriptions, OMEGA predictive cards
- **OMEGA Core**: BrainViz, Memory Explorer, DevStudio, Boardroom, AI Chat
- **Finance**: revenue share, subscriptions, pricing, payouts
- **Team**: staff, roles, tasks, referrals
- **Content**: scheduler, analytics, templates, brand voice
- **Settings**: API keys, legal entity, security, emergency stop

## API Keys

1. Go to **Settings → API Keys**.
2. Add your Groq/OpenAI/Anthropic keys.
3. OMEGA will automatically route requests and fall back to the next provider if one fails.

## Metrics to Watch

- MRR (Monthly Recurring Revenue)
- Active subscriptions
- Churn rate
- AI generation usage
- Overages and top-up packs
- Team task completion
- Viral post performance

## Emergency Stop

If OMEGA behaves unexpectedly, click the red **STOP** button in the header. This pauses all AI operations immediately. Click **RESUME** to restore.

## Withdrawals / Payouts

1. Go to **Finance → Revenue Share**.
2. Connect your payout method.
3. Request withdrawal. Minimum amount depends on your region.

## Adding Staff

1. Go to **Team → Staff**.
2. Invite by email and assign role: admin, manager, creator, support.
3. Staff can access only the sections allowed by their role.

## White-Label Setup

1. Go to **Settings → Legal / Brand**.
2. Upload logo, set brand colors, custom domain.
3. Client-facing pages will use your branding.

## Support

If something breaks, check:
- `/api/health` on your backend
- Browser console for frontend errors
- MongoDB connection status
- AI provider key balances
