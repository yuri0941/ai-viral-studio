import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загружаем .env из корня backend
const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

// ============ FALLBACK ЗНАЧЕНИЯ ============
// [security-hardening Б5-З4] JWT_SECRET без fallback в production: hardcoded secret = подделка токенов
if (!process.env.JWT_SECRET) {
    if ((process.env.NODE_ENV || '') === 'production') {
        console.error('❌ JWT_SECRET не задан в env — запуск в production запрещён (безопасность)')
        process.exit(1)
    }
    console.log('⚠️  JWT_SECRET not found in .env, using DEV-ONLY fallback')
    process.env.JWT_SECRET = 'dev_only_insecure_jwt_secret_change_me'
}

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.log('⚠️  MONGO_URI not found in .env, using fallback')
    process.env.MONGO_URI = 'mongodb://localhost:27017/ai_viral_studio'
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ai_viral_studio'
}

// [security-hardening Б5-З4] hardcoded AI-ключи УДАЛЕНЫ из репозитория (были засвечены в git).
// Ключи — только из env или Кабинета (MongoDB, hot-reload Б4). Старые значения → на ротацию владельцу.
for (const varName of ['GROQ_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'YOUTUBE_API_KEY']) {
    if (!process.env[varName]) {
        console.log(`ℹ️  ${varName} не задан в env — возьмётся из Кабинета (API Ключи) при наличии`)
    }
}

// Stripe/Coinbase fallbacks — без warning-спама; статус выводим одной info-строкой ниже
if (!process.env.STRIPE_SECRET_KEY) {
    process.env.STRIPE_SECRET_KEY = 'sk_test_51O00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
    process.env.STRIPE_WEBHOOK_SECRET = ''
}
if (!process.env.COINBASE_API_KEY) {
    process.env.COINBASE_API_KEY = ''
}

// Payment settings
process.env.STRIPE_ENABLED = process.env.STRIPE_ENABLED || 'true'
process.env.COINBASE_ENABLED = process.env.COINBASE_ENABLED || 'true'

const stripeSource = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')
    ? 'live'
    : (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_51O0'))
        ? 'test'
        : 'disabled (19.13)'
const coinbaseSource = process.env.COINBASE_API_KEY ? 'env' : 'disabled (19.13)'
const yookassaSource = process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY ? 'env' : 'db_or_disabled'
console.info(`[payments] yookassa=${yookassaSource}, stripe=${stripeSource}, coinbase=${coinbaseSource}`)

// AI providers
process.env.AGNES_ENABLED = process.env.AGNES_ENABLED || 'false'
process.env.GROQ_ENABLED = process.env.GROQ_ENABLED || 'true'
process.env.DEEPSEEK_ENABLED = process.env.DEEPSEEK_ENABLED || 'true'
process.env.OPENROUTER_ENABLED = process.env.OPENROUTER_ENABLED || 'true'
process.env.HF_ENABLED = process.env.HF_ENABLED || 'false'

// JWT
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

// Server
process.env.PORT = process.env.PORT || '5000'
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
