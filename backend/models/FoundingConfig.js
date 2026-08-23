// [PLANCONFIG-ADMIN] Настройки founding-программы в БД (hot-reload без деплоя).
// Синглтон-документ; значения по умолчанию — текущие (скидка 30%, 50 слотов), НЕ менять при миграции.
import mongoose from 'mongoose'

const foundingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'founding', unique: true },
    discountPercent: { type: Number, default: 30, min: 0, max: 100 },
    totalSlots: { type: Number, default: 50, min: 0 },
  },
  { timestamps: true }
)

const CACHE_TTL_MS = 60 * 1000
let cache = null
let cacheAt = 0

foundingConfigSchema.statics.getConfig = async function () {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache
  let doc = await this.findOne({ key: 'founding' }).lean()
  if (!doc) {
    doc = (await this.create({ key: 'founding' })).toObject()
  }
  cache = doc
  cacheAt = Date.now()
  return doc
}

foundingConfigSchema.statics.invalidateFoundingCache = function () {
  cache = null
  cacheAt = 0
}

const FoundingConfig = mongoose.models.FoundingConfig || mongoose.model('FoundingConfig', foundingConfigSchema)
export default FoundingConfig
