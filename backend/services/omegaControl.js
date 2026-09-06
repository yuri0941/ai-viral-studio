// [OMEGA-CONTROL] OMEGA Control в owner-боте TG (/omega): живые статусы 4 контуров автономии
// (AutoPilot / Dream / Memory / Self-Healing) из реальных данных сервисов + вкл/выкл контуров
// ТОЛЬКО через превью-подтверждение владельца (oc:ask → ✅/❌ → oc:set).
// Рубильники — OwnerSettings.omegaControl (дефолт true = поведение прода не меняется).
// Memory — статус-only: память системная (её используют Dream/Self-Healing/посты), тумблера нет осознанно.
import mongoose from 'mongoose'
import { getOmegaControl, setOmegaControlFlag } from '../models/OwnerSettings.js'

const CONTOURS = {
    autopilot: {
        title: 'AutoPilot',
        desc: 'ежедневный прогон 09:00 MSK: напоминания об истечении подписок, даунгрейд past_due',
        offConsequence: 'напоминания клиентам об истечении и авто-даунгрейд просроченных подписок остановятся',
    },
    dream: {
        title: 'Dream Mode',
        desc: 'ночная смена 02:00–06:00 (тренды, идеи клиентам, самообучение) + брифинг 08:00',
        offConsequence: 'ночные смены и утренний брифинг в TG остановятся',
    },
    selfHealing: {
        title: 'Self-Healing',
        desc: 'health-тики каждые 5 мин: health-check, авто-переключение AI-провайдеров, алерты',
        offConsequence: 'авто-диагностика и авто-переключение AI-провайдеров остановятся — сбой заметим вручную',
    },
}

function fmtDate(d) {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

async function getDreamLiveStatus() {
    try {
        const { default: dreamMode } = await import('../ai/omega/dreamMode.js')
        const s = dreamMode.getStatus()
        return `последняя смена: ${fmtDate(s.lastRun)} · идей: ${s.metrics?.ideasGenerated ?? 0} · трендов: ${s.metrics?.trendsScanned ?? 0}`
    } catch (e) {
        return `статус недоступен: ${e.message}`
    }
}

async function getMemoryLiveStatus() {
    try {
        await import('../models/CognitiveNode.js') // регистрация схемы до mongoose.model()
        const Node = mongoose.model('CognitiveNode')
        const [count, last] = await Promise.all([
            Node.countDocuments(),
            Node.findOne().sort({ createdAt: -1 }).select('createdAt').lean(),
        ])
        return `узлов памяти: ${count} · последняя запись: ${fmtDate(last?.createdAt)}`
    } catch (e) {
        return `статус недоступен: ${e.message}`
    }
}

async function getSelfHealingLiveStatus() {
    try {
        const { getSelfHealingStatus } = await import('./selfHealing.js')
        const s = await getSelfHealingStatus()
        const active = (s.providers || []).find(p => p.enabled && p.status === 'active')
        return `здоровье: ${s.healthy ? '✅' : '⚠️'} · ошибок подряд: ${s.consecutiveHealthErrors} · mock: ${s.mockMode ? 'да' : 'нет'} · AI: ${active?.id || '—'}`
    } catch (e) {
        return `статус недоступен: ${e.message}`
    }
}

export async function buildOmegaControlPanel() {
    const flags = await getOmegaControl()
    const [dreamLive, memoryLive, healLive] = await Promise.all([
        getDreamLiveStatus(), getMemoryLiveStatus(), getSelfHealingLiveStatus(),
    ])
    const line = (key, live) => {
        const on = flags[key] !== false
        return `${on ? '🟢' : '🔴'} <b>${CONTOURS[key].title}</b> — ${on ? 'включён' : 'выключен'}\n   ${CONTOURS[key].desc}\n   ${live}`
    }
    const text =
        `🧠 <b>OMEGA Control</b>\n━━━━━━━━━━━━━━\n` +
        `${line('autopilot', 'ежедневно 09:00 MSK')}\n\n` +
        `${line('dream', dreamLive)}\n\n` +
        `${line('selfHealing', healLive)}\n\n` +
        `🟢 <b>Memory</b> — всегда включена (системный контур)\n   долговременная память OMEGA\n   ${memoryLive}\n\n` +
        `Переключение — только после подтверждения ✅`
    const keyboard = {
        inline_keyboard: [
            [{ text: flags.autopilot !== false ? '⏸ AutoPilot' : '▶️ AutoPilot', callback_data: 'oc:ask:autopilot' },
             { text: flags.dream !== false ? '⏸ Dream' : '▶️ Dream', callback_data: 'oc:ask:dream' }],
            [{ text: flags.selfHealing !== false ? '⏸ Self-Healing' : '▶️ Self-Healing', callback_data: 'oc:ask:selfHealing' },
             { text: '🔄 Обновить', callback_data: 'oc:refresh' }],
        ],
    }
    return { text, keyboard }
}

export async function handleOmegaControlCallback({ q, chatId, bot, safeSendMessage }) {
    const data = q.data
    if (data === 'oc:refresh') {
        const { text, keyboard } = await buildOmegaControlPanel()
        await bot.editMessageText(text, { chat_id: chatId, message_id: q.message.message_id, parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {})
        return
    }
    if (data === 'oc:cancel') {
        const { text, keyboard } = await buildOmegaControlPanel()
        await bot.editMessageText(text, { chat_id: chatId, message_id: q.message.message_id, parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {})
        return
    }
    if (data.startsWith('oc:ask:')) {
        const key = data.slice('oc:ask:'.length)
        const c = CONTOURS[key]
        if (!c) { safeSendMessage(chatId, '⚠️ Неизвестный контур'); return }
        const flags = await getOmegaControl()
        const nowOn = flags[key] !== false
        const action = nowOn ? 'выключить' : 'включить'
        await bot.editMessageText(
            `${nowOn ? '⏸' : '▶️'} <b>${c.title}</b> — ${action}?\n━━━━━━━━━━━━━━\n${c.desc}\n\n${nowOn ? `⚠️ Если выключить: ${c.offConsequence}.` : 'Контур возобновит работу по своему расписанию.'}`,
            {
                chat_id: chatId, message_id: q.message.message_id, parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[
                    { text: `✅ Да, ${action}`, callback_data: `oc:set:${key}:${nowOn ? 0 : 1}` },
                    { text: '❌ Отмена', callback_data: 'oc:cancel' },
                ]] },
            }
        ).catch(() => {})
        return
    }
    if (data.startsWith('oc:set:')) {
        const [, key, val] = data.split(':')
        const c = CONTOURS[key]
        if (!c || !['0', '1'].includes(val)) { safeSendMessage(chatId, '⚠️ Неизвестный контур'); return }
        await setOmegaControlFlag(key, val === '1')
        console.log(`[OMEGA-CONTROL] ${c.title} → ${val === '1' ? 'ON' : 'OFF'} (owner TG)`)
        const { text, keyboard } = await buildOmegaControlPanel()
        await bot.editMessageText(`✅ ${c.title} ${val === '1' ? 'включён' : 'выключен'}.\n\n${text}`, { chat_id: chatId, message_id: q.message.message_id, parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {})
        return
    }
}
