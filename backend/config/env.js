import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загружаем .env из корня backend
const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

// ============ FALLBACK ЗНАЧЕНИЯ ============
if (!process.env.JWT_SECRET) {
    console.log('⚠️  JWT_SECRET not found in .env, using fallback')
    process.env.JWT_SECRET = 'supersecretkey2026_ai_viral_studio_jwt'
}

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.log('⚠️  MONGO_URI not found in .env, using fallback')
    process.env.MONGO_URI = 'mongodb://localhost:27017/ai_viral_studio'
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ai_viral_studio'
}

if (!process.env.GROQ_API_KEY) {
    console.log('⚠️  GROQ_API_KEY not found in .env, using fallback')
    process.env.GROQ_API_KEY = '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'
}

if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️  OPENROUTER_API_KEY not found in .env, using fallback')
    process.env.OPENROUTER_API_KEY = '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'
}

if (!process.env.DEEPSEEK_API_KEY) {
    console.log('⚠️  DEEPSEEK_API_KEY not found in .env, using fallback')
    process.env.DEEPSEEK_API_KEY = 'sk-bc6b9d2b72b04438bb14cee22bdb17e4'
}

if (!process.env.YOUTUBE_API_KEY) {
    console.log('⚠️  YOUTUBE_API_KEY not found in .env, using fallback')
    process.env.YOUTUBE_API_KEY = 'AIzaSyD1SH9WizR4zgi7JUshXfTuzHsJagmu4zU'
}

if (!process.env.STRIPE_SECRET_KEY) {
    console.log('⚠️  STRIPE_SECRET_KEY not found in .env, using fallback (test mode)')
    process.env.STRIPE_SECRET_KEY = 'sk_test_51O00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET not found in .env, webhook disabled')
    process.env.STRIPE_WEBHOOK_SECRET = ''
}

if (!process.env.COINBASE_API_KEY) {
    console.log('⚠️  COINBASE_API_KEY not found in .env, crypto payments disabled')
    process.env.COINBASE_API_KEY = ''
}

// Payment settings
process.env.STRIPE_ENABLED = process.env.STRIPE_ENABLED || 'true'
process.env.COINBASE_ENABLED = process.env.COINBASE_ENABLED || 'true'

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
