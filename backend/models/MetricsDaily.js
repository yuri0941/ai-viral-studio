import mongoose from 'mongoose'

// [P1.5-METRICS] дневные счётчики воронки — один документ на UTC-день, upsert по дате
const metricsDailySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // UTC-день 'YYYY-MM-DD'
    visits: { type: Number, default: 0 },
    signups: { type: Number, default: 0 },
    firstPosts: { type: Number, default: 0 },
    paidCount: { type: Number, default: 0 },
    revenueRub: { type: Number, default: 0 },
})

export default mongoose.model('MetricsDaily', metricsDailySchema)
