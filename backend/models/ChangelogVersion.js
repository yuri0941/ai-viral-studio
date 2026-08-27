import mongoose from 'mongoose'

// [OWNER-OMEGA] Changelog модалки обновлений — редактируется из кабинета владельца без правки кода.
// Публичный GET /api/version/structured-changelog отдаёт записи; фронт при пустой БД
// падает назад на встроенный src/config/changelog.json.
const ChangelogItemSchema = new mongoose.Schema({
    audience: { type: String, enum: ['all', 'client', 'owner'], default: 'all' },
    title: { ru: { type: String, default: '' }, en: { type: String, default: '' } },
    body: { ru: { type: String, default: '' }, en: { type: String, default: '' } },
}, { _id: true })

const ChangelogVersionSchema = new mongoose.Schema({
    version: { type: String, required: true, trim: true },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    items: { type: [ChangelogItemSchema], default: [] },
}, { timestamps: true })

ChangelogVersionSchema.index({ createdAt: -1 })

export default mongoose.model('ChangelogVersion', ChangelogVersionSchema)
