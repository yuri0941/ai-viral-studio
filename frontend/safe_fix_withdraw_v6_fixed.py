#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
safe_fix_withdraw_v6_fixed.py — Исправленная версия с правильными отступами (4 пробела)
Безопасное добавление 6 типов вывода средств в OwnerDashboardPage.jsx
"""

import os
import shutil
import re

OWNER_FILE = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"


def check_braces(content):
    """Проверяет баланс фигурных скобок."""
    count = 0
    in_string = False
    string_char = None
    escape = False
    for i, ch in enumerate(content):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if not in_string and ch in ("'", '"'):
            in_string = True
            string_char = ch
            continue
        if in_string and ch == string_char:
            in_string = False
            continue
        if in_string:
            continue
        if ch == "{":
            count += 1
        elif ch == "}":
            count -= 1
            if count < 0:
                return False, i
    return count == 0, None


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


print("=" * 70)
print(" SAFE FIX v6 FIXED — Вывод средств: 6 типов реквизитов + Крипта")
print("=" * 70)

if not os.path.exists(OWNER_FILE):
    print(f"❌ Файл не найден: {OWNER_FILE}")
    exit(1)

c = read_file(OWNER_FILE)
print(f"📊 Размер: {len(c)} байт, строк: {c.count(chr(10))}")

# Бэкап
backup = OWNER_FILE + ".backup_v6_withdraw"
shutil.copy2(OWNER_FILE, backup)
print(f"💾 Бэкап: {backup}")

ok, pos = check_braces(c)
if not ok:
    print(f"❌ Файл уже сломан! Лишняя }} на позиции {pos}")
    exit(1)
print("✅ Баланс скобок ДО: ОК")

changed = False
errors = []

# ═══════════════════════════════════════════════════════════════════
# ШАГ 1: Добавить Bitcoin в импорты lucide-react
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 1: Проверка импортов lucide-react...")

if "Bitcoin" not in c:
    old_import = "Zap, Sparkles, Upload, Gift, Newspaper, Share2,"
    new_import = "Zap, Sparkles, Upload, Gift, Newspaper, Share2, Bitcoin,"
    if old_import in c:
        c = c.replace(old_import, new_import)
        changed = True
        print("   ✅ Bitcoin добавлен в импорты")
    else:
        old_import2 = "Zap, Sparkles, Upload, Gift, Newspaper, Share2"
        new_import2 = "Zap, Sparkles, Upload, Gift, Newspaper, Share2, Bitcoin"
        if old_import2 in c:
            c = c.replace(old_import2, new_import2)
            changed = True
            print("   ✅ Bitcoin добавлен в импорты (вариант 2)")
        else:
            errors.append("   ⚠️ Не удалось добавить Bitcoin в импорты")
            print("   ⚠️ Не удалось добавить Bitcoin в импорты")
else:
    print("   ✅ Bitcoin уже в импортах")


# ═══════════════════════════════════════════════════════════════════
# ШАГ 2: Добавить состояния withdrawType и withdrawRequisites
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 2: Добавление состояний withdrawType и withdrawRequisites...")

if "const [withdrawType, setWithdrawType]" not in c:
    marker = "const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'wire', account: '' })"
    if marker in c:
        insert_after = marker
        new_states = """\n    const [withdrawType, setWithdrawType] = useState('legal') // 'legal' | 'ip' | 'card' | 'international' | 'crypto' | 'paypal'
    const [withdrawRequisites, setWithdrawRequisites] = useState(() => {
        const saved = localStorage.getItem('owner_withdraw_requisites')
        return saved ? JSON.parse(saved) : {
            legal: { companyName: '', inn: '', kpp: '', rs: '', bik: '', bank: '' },
            ip: { fullName: '', inn: '', ogrnip: '', rs: '', bik: '', bank: '' },
            card: { cardNumber: '', cardHolder: '', bank: '' },
            international: { iban: '', swift: '', bankName: '', bankAddress: '', country: '', beneficiaryName: '' },
            crypto: { walletAddress: '', network: 'TRC20', currency: 'USDT' },
            paypal: { email: '' }
        }
    })"""
        c = c.replace(insert_after, insert_after + new_states)
        changed = True
        print("   ✅ Состояния withdrawType и withdrawRequisites добавлены")
    else:
        errors.append("   ❌ Маркер withdrawForm не найден")
        print("   ❌ Маркер withdrawForm не найден")
else:
    print("   ✅ Состояния уже есть")


# ═══════════════════════════════════════════════════════════════════
# ШАГ 3: Добавить состояние payments (ИСПРАВЛЕННЫЙ ОТСТУП!)
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 3: Добавление состояния payments...")

if "const [payments, setPayments]" not in c:
    # ИСПРАВЛЕНИЕ: 4 пробела вместо 8!
    marker = "    const [showPassword, setShowPassword] = useState(false)"
    if marker in c:
        idx = c.find(marker)
        after = c[idx:idx+300]
        if "payments" not in after:
            insert_after = marker
            new_payments = """\n    const [payments, setPayments] = useState(() => {
        const saved = localStorage.getItem('owner_payments')
        return saved ? JSON.parse(saved) : [
            { id: 1, date: '20 июл 2026', amount: '$15,000', status: 'completed', method: 'Wire Transfer' },
            { id: 2, date: '15 июл 2026', amount: '$8,500', status: 'completed', method: 'PayPal' },
            { id: 3, date: '10 июл 2026', amount: '$12,000', status: 'completed', method: 'Wire Transfer' },
            { id: 4, date: '5 июл 2026', amount: '$5,200', status: 'pending', method: 'Crypto (USDT)' }
        ]
    })"""
            c = c.replace(insert_after, insert_after + new_payments)
            changed = True
            print("   ✅ Состояние payments добавлено")
        else:
            print("   ✅ payments уже есть рядом с showPassword")
    else:
        errors.append("   ❌ Маркер showPassword не найден (проверьте отступы)")
        print("   ❌ Маркер showPassword не найден (проверьте отступы)")
else:
    print("   ✅ Состояние payments уже есть")


# ═══════════════════════════════════════════════════════════════════
# ШАГ 4: Заменить handleWithdraw
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 4: Замена handleWithdraw...")

old_handle = """    const handleWithdraw = () => {
        if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) { showToast('Введите сумму', 'error'); return }
        if (!withdrawForm.account) { showToast('Введите реквизиты', 'error'); return }
        setShowWithdrawModal(false)
        showToast(`Вывод $${withdrawForm.amount} на ${withdrawForm.method.toUpperCase()} инициирован`)
        setWithdrawForm({ amount: '', method: 'wire', account: '' })
    }"""

new_handle = """    const handleWithdraw = () => {
        if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) { showToast('Введите сумму', 'error'); return }
        const currentRequisites = withdrawRequisites[withdrawType]
        const hasRequisites = Object.values(currentRequisites).some(v => v && v.toString().trim() !== '')
        if (!hasRequisites) { showToast('Заполните реквизиты', 'error'); return }

        localStorage.setItem('owner_withdraw_requisites', JSON.stringify(withdrawRequisites))

        const typeLabels = { legal: 'Юр. лицо', ip: 'ИП', card: 'Карта', international: 'SWIFT/IBAN', crypto: 'Крипта', paypal: 'PayPal' }
        const newPayment = {
            id: Date.now(),
            date: new Date().toLocaleDateString('ru-RU'),
            amount: `$${withdrawForm.amount}`,
            status: 'pending',
            method: typeLabels[withdrawType]
        }
        const updatedPayments = [newPayment, ...payments]
        setPayments(updatedPayments)
        localStorage.setItem('owner_payments', JSON.stringify(updatedPayments))

        setShowWithdrawModal(false)
        showToast(`Вывод $${withdrawForm.amount} (${typeLabels[withdrawType]}) инициирован`, 'success')
        setWithdrawForm({ amount: '' })
    }"""

if old_handle in c:
    c = c.replace(old_handle, new_handle)
    changed = True
    print("   ✅ handleWithdraw заменён")
else:
    if "const currentRequisites = withdrawRequisites[withdrawType]" in c:
        print("   ✅ handleWithdraw уже новый")
    else:
        errors.append("   ❌ Старый handleWithdraw не найден")
        print("   ❌ Старый handleWithdraw не найден")


# ═══════════════════════════════════════════════════════════════════
# ШАГ 5: Заменить блок Finance Tab
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 5: Замена блока Finance Tab...")

old_finance = """{/* Finance Tab */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Баланс</p>
                                    <p className="text-3xl font-black text-[#00ff41]">$47,250</p>
                                    <p className="text-xs text-gray-500 mt-2">Доступно для вывода</p>
                                    <button onClick={() => setShowWithdrawModal(true)} className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-all hover:scale-[1.02] text-sm flex items-center justify-center gap-2"><Wallet size={16} /> Вывести</button>
                                </div>
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Ожидается</p>
                                    <p className="text-3xl font-black text-[#2563eb]">$12,800</p>
                                    <p className="text-xs text-gray-500 mt-2">В обработке</p>
                                </div>
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Расходы/мес</p>
                                    <p className="text-3xl font-black text-[#f0883e]">$14,000</p>
                                    <p className="text-xs text-gray-500 mt-2">Серверы, AI API, зарплаты</p>
                                </div>
                            </div>
                            <div className="glass rounded-2xl p-6 border-white/5">
                                <h3 className="font-bold mb-6">История выплат</h3>
                                <div className="space-y-3">
                                    {[{ date: '20 июл 2026', amount: '$15,000', status: 'completed', method: 'Wire Transfer' }, { date: '15 июл 2026', amount: '$8,500', status: 'completed', method: 'PayPal' }, { date: '10 июл 2026', amount: '$12,000', status: 'completed', method: 'Wire Transfer' }, { date: '5 июл 2026', amount: '$5,200', status: 'pending', method: 'Crypto (USDT)' }].map((payout, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02]">
                                            <div><p className="font-medium">{payout.date}</p><p className="text-sm text-gray-500">{payout.method}</p></div>
                                            <div className="text-right"><p className="font-bold">{payout.amount}</p><span className={`text-xs px-2 py-0.5 rounded-full ${payout.status === 'completed' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-yellow-500/10 text-yellow-400'}`}>{payout.status === 'completed' ? 'Выполнено' : 'В обработке'}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}"""

new_finance = """{/* Finance Tab */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Баланс</p>
                                    <p className="text-3xl font-black text-[#00ff41]">$47,250</p>
                                    <p className="text-xs text-gray-500 mt-2">Доступно для вывода</p>
                                    <button onClick={() => setShowWithdrawModal(true)} className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-all hover:scale-[1.02] text-sm flex items-center justify-center gap-2"><Wallet size={16} /> Вывести</button>
                                </div>
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Ожидается</p>
                                    <p className="text-3xl font-black text-[#2563eb]">$12,800</p>
                                    <p className="text-xs text-gray-500 mt-2">В обработке</p>
                                </div>
                                <div className="glass rounded-2xl p-6 border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Расходы/мес</p>
                                    <p className="text-3xl font-black text-[#f0883e]">$14,000</p>
                                    <p className="text-xs text-gray-500 mt-2">Серверы, AI API, зарплаты</p>
                                </div>
                            </div>
                            <div className="glass rounded-2xl p-6 border-white/5">
                                <h3 className="font-bold mb-6">История выплат</h3>
                                <div className="space-y-3">
                                    {payments.map((payout, i) => (
                                        <div key={payout.id || i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02]">
                                            <div>
                                                <p className="font-medium">{payout.date}</p>
                                                <p className="text-sm text-gray-500">{payout.method}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{payout.amount}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${payout.status === 'completed' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {payout.status === 'completed' ? 'Выполнено' : 'В обработке'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {payments.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>История выплат пуста</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}"""

if old_finance in c:
    c = c.replace(old_finance, new_finance)
    changed = True
    print("   ✅ Блок Finance Tab заменён")
else:
    if "payments.map((payout, i)" in c:
        print("   ✅ Блок Finance Tab уже обновлён")
    else:
        errors.append("   ⚠️ Блок Finance Tab не найден")
        print("   ⚠️ Блок Finance Tab не найден")


# ═══════════════════════════════════════════════════════════════════
# ШАГ 6: Заменить модалку вывода средств
# ═══════════════════════════════════════════════════════════════════
print("\n🔧 ШАГ 6: Замена модалки вывода средств...")

old_modal = """{showWithdrawModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Wallet size={20} /> Вывод средств</h2>
                                <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="bg-emerald-500/10 rounded-lg p-4 mb-4 border border-emerald-500/20"><p className="text-sm text-gray-400">Доступно для вывода</p><p className="text-2xl font-bold text-emerald-400">$47,250</p></div>
                            <div className="space-y-4">
                                <div><label className="text-sm text-gray-400 mb-1 block">Сумма</label><input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} placeholder="1000" className="w-full px-4 py-2 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none" /></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Способ вывода</label><select value={withdrawForm.method} onChange={e => setWithdrawForm({ ...withdrawForm, method: e.target.value })} className="w-full px-4 py-2 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"><option value="wire">Wire Transfer</option><option value="paypal">PayPal</option><option value="crypto">Crypto (USDT)</option><option value="card">Банковская карта</option></select></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Реквизиты</label><input type="text" value={withdrawForm.account} onChange={e => setWithdrawForm({ ...withdrawForm, account: e.target.value })} placeholder="Счёт / Кошелёк / Карта" className="w-full px-4 py-2 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none" /></div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowWithdrawModal(false)} className="flex-1 px-4 py-2 bg-[#252530] rounded-lg hover:bg-[#303040] transition-colors">Отмена</button>
                                <button onClick={handleWithdraw} disabled={!withdrawForm.amount || !withdrawForm.account} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-black font-medium rounded-lg transition-all">Вывести</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}"""

new_modal = """{showWithdrawModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Wallet size={20} /> Вывод средств</h2>
                                <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="bg-emerald-500/10 rounded-lg p-4 mb-4 border border-emerald-500/20">
                                <p className="text-sm text-gray-400">Доступно для вывода</p>
                                <p className="text-2xl font-bold text-emerald-400">$47,250</p>
                            </div>

                            {/* Переключатель типа вывода */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-400 mb-2 block">Способ вывода</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'legal', label: 'Юр. лицо', icon: Building2 },
                                        { id: 'ip', label: 'ИП', icon: User },
                                        { id: 'card', label: 'Карта', icon: CreditCard },
                                        { id: 'international', label: 'SWIFT', icon: Globe },
                                        { id: 'crypto', label: 'Крипта', icon: Bitcoin },
                                        { id: 'paypal', label: 'PayPal', icon: Mail },
                                    ].map(type => {
                                        const Icon = type.icon
                                        return (
                                            <button
                                                key={type.id}
                                                onClick={() => setWithdrawType(type.id)}
                                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${withdrawType === type.id
                                                    ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                                                    : 'border-white/5 bg-[#252530] text-gray-400 hover:border-white/10'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                                <span className="text-xs">{type.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Сумма */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-400 mb-1 block">Сумма</label>
                                <input
                                    type="number"
                                    value={withdrawForm.amount}
                                    onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                    placeholder="1000"
                                    className="w-full px-4 py-2 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Формы реквизитов по типу */}
                            <div className="space-y-3 mb-4">
                                {withdrawType === 'legal' && (
                                    <>
                                        <input type="text" placeholder="Название компании" value={withdrawRequisites.legal.companyName} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, companyName: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="ИНН" value={withdrawRequisites.legal.inn} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, inn: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                            <input type="text" placeholder="КПП" value={withdrawRequisites.legal.kpp} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, kpp: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        </div>
                                        <input type="text" placeholder="Расчётный счёт" value={withdrawRequisites.legal.rs} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, rs: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="БИК" value={withdrawRequisites.legal.bik} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, bik: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                            <input type="text" placeholder="Банк" value={withdrawRequisites.legal.bank} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, legal: { ...withdrawRequisites.legal, bank: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        </div>
                                    </>
                                )}

                                {withdrawType === 'ip' && (
                                    <>
                                        <input type="text" placeholder="ФИО" value={withdrawRequisites.ip.fullName} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, fullName: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="ИНН" value={withdrawRequisites.ip.inn} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, inn: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                            <input type="text" placeholder="ОГРНИП" value={withdrawRequisites.ip.ogrnip} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, ogrnip: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        </div>
                                        <input type="text" placeholder="Расчётный счёт" value={withdrawRequisites.ip.rs} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, rs: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="БИК" value={withdrawRequisites.ip.bik} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, bik: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                            <input type="text" placeholder="Банк" value={withdrawRequisites.ip.bank} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, ip: { ...withdrawRequisites.ip, bank: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        </div>
                                    </>
                                )}

                                {withdrawType === 'card' && (
                                    <>
                                        <input type="text" placeholder="Номер карты" value={withdrawRequisites.card.cardNumber} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, card: { ...withdrawRequisites.card, cardNumber: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <input type="text" placeholder="ФИО держателя" value={withdrawRequisites.card.cardHolder} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, card: { ...withdrawRequisites.card, cardHolder: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <input type="text" placeholder="Банк" value={withdrawRequisites.card.bank} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, card: { ...withdrawRequisites.card, bank: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                    </>
                                )}

                                {withdrawType === 'international' && (
                                    <>
                                        <input type="text" placeholder="IBAN" value={withdrawRequisites.international.iban} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, iban: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="SWIFT/BIC" value={withdrawRequisites.international.swift} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, swift: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                            <input type="text" placeholder="Страна" value={withdrawRequisites.international.country} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, country: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        </div>
                                        <input type="text" placeholder="Название банка" value={withdrawRequisites.international.bankName} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, bankName: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <input type="text" placeholder="Адрес банка" value={withdrawRequisites.international.bankAddress} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, bankAddress: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <input type="text" placeholder="Имя получателя (Beneficiary)" value={withdrawRequisites.international.beneficiaryName} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, international: { ...withdrawRequisites.international, beneficiaryName: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                    </>
                                )}

                                {withdrawType === 'crypto' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <select value={withdrawRequisites.crypto.currency} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, crypto: { ...withdrawRequisites.crypto, currency: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm text-white">
                                                <option value="USDT">USDT</option>
                                                <option value="BTC">Bitcoin (BTC)</option>
                                                <option value="ETH">Ethereum (ETH)</option>
                                            </select>
                                            <select value={withdrawRequisites.crypto.network} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, crypto: { ...withdrawRequisites.crypto, network: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm text-white">
                                                <option value="TRC20">TRC20 (Tron)</option>
                                                <option value="ERC20">ERC20 (Ethereum)</option>
                                                <option value="BEP20">BEP20 (BSC)</option>
                                                <option value="SOL">Solana</option>
                                                <option value="BTC">Bitcoin</option>
                                            </select>
                                        </div>
                                        <input type="text" placeholder="Адрес кошелька" value={withdrawRequisites.crypto.walletAddress} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, crypto: { ...withdrawRequisites.crypto, walletAddress: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                        <div className="bg-[#1a1a24] rounded-lg p-3 border border-white/5">
                                            <p className="text-xs text-gray-500 mb-1">Выбрано:</p>
                                            <p className="text-sm text-[#00ff41] font-medium">{withdrawRequisites.crypto.currency} — {withdrawRequisites.crypto.network}</p>
                                            <p className="text-xs text-gray-500 mt-1">Убедитесь, что адрес кошелька соответствует выбранной сети!</p>
                                        </div>
                                    </>
                                )}

                                {withdrawType === 'paypal' && (
                                    <input type="email" placeholder="Email PayPal" value={withdrawRequisites.paypal.email} onChange={e => setWithdrawRequisites({ ...withdrawRequisites, paypal: { ...withdrawRequisites.paypal, email: e.target.value } })} className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm" />
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowWithdrawModal(false)} className="flex-1 px-4 py-2.5 bg-[#252530] rounded-lg hover:bg-[#303040] transition-colors text-sm">Отмена</button>
                                <button onClick={handleWithdraw} disabled={!withdrawForm.amount} className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-black font-medium rounded-lg transition-all text-sm">Вывести</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}"""

if old_modal in c:
    c = c.replace(old_modal, new_modal)
    changed = True
    print("   ✅ Модалка вывода средств заменена")
else:
    if "{ id: 'crypto', label: 'Крипта', icon: Bitcoin }" in c:
        print("   ✅ Модалка вывода средств уже новая")
    else:
        errors.append("   ⚠️ Старая модалка вывода не найдена")
        print("   ⚠️ Старая модалка вывода не найдена")


# ═══════════════════════════════════════════════════════════════════
# ФИНАЛЬНАЯ ПРОВЕРКА
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("ФИНАЛЬНАЯ ПРОВЕРКА")
print("=" * 70)

ok, pos = check_braces(c)
if not ok:
    print(f"❌ Баланс скобок ПОСЛЕ нарушен! Лишняя }} на позиции {pos}")
    print("   Откатываем...")
    shutil.copy2(backup, OWNER_FILE)
    print("   ✅ Восстановлено из бэкапа")
    exit(1)

print("✅ Баланс скобок ПОСЛЕ: ОК")

checks = {
    'Bitcoin в импортах': 'Bitcoin' in c,
    'withdrawType': 'const [withdrawType, setWithdrawType]' in c,
    'withdrawRequisites': 'const [withdrawRequisites, setWithdrawRequisites]' in c,
    'payments': 'const [payments, setPayments]' in c,
    'handleWithdraw новый': 'const currentRequisites = withdrawRequisites[withdrawType]' in c,
    'Модалка с 6 типами': "{ id: 'crypto', label: 'Крипта', icon: Bitcoin }" in c,
    'Finance из payments': 'payments.map((payout, i)' in c,
}

print("\n📋 Проверка элементов:")
all_ok = True
for name, found in checks.items():
    status = "✅" if found else "❌"
    if not found:
        all_ok = False
    print(f"   {status} {name}")

if changed and all_ok:
    write_file(OWNER_FILE, c)
    print(f"\n💾 Файл сохранён ({len(c)} байт)")
    print("\n" + "=" * 70)
    print("✅ ГОТОВО! Перезагрузи страницу (F5)")
    print("=" * 70)
    print("\n📋 ЧТО ДОБАВЛЕНО:")
    print("  1. 💳 6 типов вывода: Юр. лицо, ИП, Карта, SWIFT, Крипта, PayPal")
    print("  2. ₿ Криптокошелёк: USDT/BTC/ETH + сети TRC20/ERC20/BEP20/SOL/BTC")
    print("  3. 💾 Сохранение реквизитов в localStorage")
    print("  4. 📊 История выплат из payments (с localStorage)")
    print("  5. 🔒 Проверка реквизитов перед выводом")
elif not changed and all_ok:
    print("\n✅ Все изменения уже применены! Ничего не требуется.")
else:
    print("\n⚠️  Есть проблемы (смотри выше). Файл НЕ сохранён.")
    print("   Бэкап: " + backup)

if errors:
    print("\n⚠️  Предупреждения:")
    for e in errors:
        print(f"   {e}")
