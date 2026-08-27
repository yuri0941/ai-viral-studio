import mongoose from 'mongoose'

// [OWNER-OMEGA] Ручной ввод инфраструктурных расходов (Render, MongoDB, Cloudflare и т.п.).
// Одна запись на сервис (upsert), сумма — ₽/мес.
const InfraExpenseSchema = new mongoose.Schema({
    service: { type: String, required: true, unique: true, trim: true },
    amountRub: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('InfraExpense', InfraExpenseSchema)
