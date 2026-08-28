// [OWNER-OMEGA] одноразовая вставка ключей apiKeys.group.* / apiKeys.where.* / botHotReloadHint в 4 локали.
// Запуск: node scripts/i18n-owner-omega-fill.mjs
import fs from 'node:fs'

const FILES = [
    ['frontend/src/locales/ru.json', 'ru'],
    ['frontend/public/locales/ru.json', 'ru'],
    ['frontend/src/locales/en.json', 'en'],
    ['frontend/public/locales/en.json', 'en'],
]

const groupRu = {
    all: 'Все', aiText: '🧠 AI-текст', aiImage: '🎨 AI-картинки', social: '🔗 Соцсети',
    payments: '💳 Платежи', bots: '🤖 Боты', push: '🔔 Push', email: '✉️ Email',
}
const groupEn = {
    all: 'All', aiText: '🧠 AI text', aiImage: '🎨 AI images', social: '🔗 Social',
    payments: '💳 Payments', bots: '🤖 Bots', push: '🔔 Push', email: '✉️ Email',
}

const whereRu = {
    groq: 'console.groq.com → API Keys',
    openrouter: 'openrouter.ai → Keys',
    openai: 'platform.openai.com → API keys',
    gemini: 'aistudio.google.com → Get API key',
    elevenlabs: 'elevenlabs.io → Profile → API Key',
    replicate: 'replicate.com → Account → API tokens',
    serpapi: 'serpapi.com → API Key',
    youtube: 'console.cloud.google.com → Credentials → API key (YouTube Data API v3)',
    cloudflare: 'dash.cloudflare.com → Workers AI → API token',
    fireworks: 'fireworks.ai → API Keys',
    mistral: 'console.mistral.ai → API keys',
    cohere: 'dashboard.cohere.com → API keys',
    deepseek: 'platform.deepseek.com → API keys',
    github: 'github.com/settings/tokens (Models)',
    huggingface: 'huggingface.co → Settings → Access Tokens',
    pollinations: 'Ключ не нужен — бесплатный генератор',
    together: 'api.together.xyz → API Keys',
    cerebras: 'cloud.cerebras.ai → API Keys',
    chroma: 'app.trychroma.com → API Keys',
    vk: 'id.vk.com → Приложения → ID приложения',
    vk_secret: 'id.vk.com → Приложения → Защищённый ключ',
    telegram_bot: '@BotFather → /mybots → API Token (клиентский бот)',
    telegram_owner_bot: '@BotFather → /mybots → API Token (бот владельца)',
    telegram_chat_id: 'Напишите боту «мой id» — пришлёт chat_id',
    telegram_channel: '@username канала (бот должен быть админом канала)',
    yookassa_shop_id: 'yookassa.ru → Настройки → shopId (6 цифр)',
    yookassa_secret: 'yookassa.ru → Интеграция → API → secret test_/live_',
    stripe: 'dashboard.stripe.com → API keys → Secret key',
    stripe_webhook: 'dashboard.stripe.com → Webhooks → Signing secret',
    paypal_client_id: 'developer.paypal.com → Apps & Credentials → Client ID',
    paypal_secret: 'developer.paypal.com → Apps & Credentials → Secret',
    vapid_public: 'Из env пары VAPID (публичный)',
    vapid_private: 'Из env пары VAPID (приватный)',
    resend: 'resend.com → API Keys',
    smtp_host: 'Почтовый провайдер → SMTP-сервер',
    smtp_user: 'Почтовый провайдер → логин SMTP',
    smtp_pass: 'Почтовый провайдер → пароль приложения',
}
const whereEn = {
    groq: 'console.groq.com → API Keys',
    openrouter: 'openrouter.ai → Keys',
    openai: 'platform.openai.com → API keys',
    gemini: 'aistudio.google.com → Get API key',
    elevenlabs: 'elevenlabs.io → Profile → API Key',
    replicate: 'replicate.com → Account → API tokens',
    serpapi: 'serpapi.com → API Key',
    youtube: 'console.cloud.google.com → Credentials → API key (YouTube Data API v3)',
    cloudflare: 'dash.cloudflare.com → Workers AI → API token',
    fireworks: 'fireworks.ai → API Keys',
    mistral: 'console.mistral.ai → API keys',
    cohere: 'dashboard.cohere.com → API keys',
    deepseek: 'platform.deepseek.com → API keys',
    github: 'github.com/settings/tokens (Models)',
    huggingface: 'huggingface.co → Settings → Access Tokens',
    pollinations: 'No key needed — free generator',
    together: 'api.together.xyz → API Keys',
    cerebras: 'cloud.cerebras.ai → API Keys',
    chroma: 'app.trychroma.com → API Keys',
    vk: 'id.vk.com → Apps → App ID',
    vk_secret: 'id.vk.com → Apps → Secure key',
    telegram_bot: '@BotFather → /mybots → API Token (client bot)',
    telegram_owner_bot: '@BotFather → /mybots → API Token (owner bot)',
    telegram_chat_id: 'Message the bot «мой id» — it replies with your chat_id',
    telegram_channel: 'Channel @username (bot must be a channel admin)',
    yookassa_shop_id: 'yookassa.ru → Settings → shopId (6 digits)',
    yookassa_secret: 'yookassa.ru → Integration → API → secret test_/live_',
    stripe: 'dashboard.stripe.com → API keys → Secret key',
    stripe_webhook: 'dashboard.stripe.com → Webhooks → Signing secret',
    paypal_client_id: 'developer.paypal.com → Apps & Credentials → Client ID',
    paypal_secret: 'developer.paypal.com → Apps & Credentials → Secret',
    vapid_public: 'From the VAPID env pair (public)',
    vapid_private: 'From the VAPID env pair (private)',
    resend: 'resend.com → API Keys',
    smtp_host: 'Mail provider → SMTP server',
    smtp_user: 'Mail provider → SMTP login',
    smtp_pass: 'Mail provider → app password',
}

const botHintRu = 'После сохранения бот переподключится автоматически (webhook обновится без деплоя). Env-токен останется запасным.'
const botHintEn = 'After saving, the bot reconnects automatically (webhook is updated without a deploy). The env token stays as a fallback.'

for (const [file, lang] of FILES) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'))
    json.apiKeys = json.apiKeys || {}
    json.apiKeys.group = lang === 'ru' ? groupRu : groupEn
    json.apiKeys.where = lang === 'ru' ? whereRu : whereEn
    json.apiKeys.botHotReloadHint = lang === 'ru' ? botHintRu : botHintEn
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
    console.log(`OK ${file}`)
}
