// [CLIENT-JOURNEY-QA] Шаг 5: поддержка — тикет → владелец видит → ответ → takeover → возврат боту.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')

let owner = await User.findOne({ email: 'qa.owner@test.dev' })
if (!owner) {
  owner = await User.create({
    name: 'QA Owner', email: 'qa.owner@test.dev', password: 'QaOwner123!',
    role: 'owner', subscription: 'agency', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
  })
}
const ownerToken = owner.generateToken()
const clientToken = JSON.parse((await import('fs')).readFileSync(path.join(__dirname, '../../.tmp-ui-polish/qa-plans.json'), 'utf8')).pro.token
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
const step = (name, ok, detail = '') => console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)

// 1. Клиент создаёт тикет
const created = await (await fetch(`${API}/api/support`, {
  method: 'POST', headers: H(clientToken),
  body: JSON.stringify({ subject: 'QA: не работает оплата', description: 'Проверка сквозного потока поддержки' }),
})).json()
const ticketId = created?.data?._id
step('клиент: тикет создан', !!ticketId, String(ticketId))

// 2. Владелец видит тикет в общем списке
const list = await (await fetch(`${API}/api/support`, { headers: H(ownerToken) })).json()
step('владелец: тикет виден в списке', (list?.data || []).some(t => t._id === ticketId))

// 3. Владелец отвечает клиенту
const reply = await (await fetch(`${API}/api/support/${ticketId}/messages`, {
  method: 'POST', headers: H(ownerToken),
  body: JSON.stringify({ text: 'Здравствуйте! Разбираемся с оплатой.' }),
})).json()
step('владелец: ответ добавлен', reply?.status === 'success' && (reply?.data?.messages || []).length > 0)

// 4. Takeover «Взять в работу»
const take = await (await fetch(`${API}/api/support/${ticketId}/status`, {
  method: 'PATCH', headers: H(ownerToken),
  body: JSON.stringify({ status: 'in_progress', takeoverBy: 'qa-owner' }),
})).json()
step('владелец: «Взять в работу» (takeover)', take?.data?.status === 'in_progress')

// 5. Клиент видит ответ в своём списке
const mine = await (await fetch(`${API}/api/support/my`, { headers: H(clientToken) })).json()
const myTicket = (mine?.tickets || []).find(t => t._id === ticketId)
step('клиент: ответ владельца виден', (myTicket?.messages || []).some(m => m.text?.includes('Разбираемся')))

// 6. «Вернуть боту» → open, takeover снят
const back = await (await fetch(`${API}/api/support/${ticketId}/status`, {
  method: 'PATCH', headers: H(ownerToken),
  body: JSON.stringify({ status: 'open' }),
})).json()
step('владелец: «Вернуть боту» — takeover снят', back?.data?.status === 'open' && !back?.data?.takeoverBy)

// 7. CSAT поле в модели (выставляется через TG-бота; здесь — проверка схемы)
const { default: SupportTicket } = await import('../models/SupportTicket.js')
const doc = await SupportTicket.findByIdAndUpdate(ticketId, { csat: 5, csatAt: new Date() }, { new: true }).lean()
step('CSAT сохраняется в тикете (1-5)', doc?.csat === 5)

await mongoose.disconnect()
