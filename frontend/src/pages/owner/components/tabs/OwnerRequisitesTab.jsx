import { useEffect, useState } from 'react';
import { Building2, Save, Trash2, CheckCircle, AlertCircle, FileText, Globe, Landmark } from 'lucide-react';
import { ownerRequisitesApi } from '../../../../services/api.js';

const INITIAL_FORM = {
  type: 'company',
  name: '',
  inn: '',
  kpp: '',
  ogrn: '',
  accountNumber: '',
  bank: '',
  bik: '',
  corrAccount: '',
  address: '',
  email: '',
  phone: '',
  director: '',
  currency: 'RUB',
  vatRate: 0,
  foreignAccount: {
    companyName: '',
    bankName: '',
    swift: '',
    iban: '',
    accountNumber: '',
    bankAddress: '',
    country: '',
  },
};

const TYPE_OPTIONS = [
  { value: 'company', label: 'Юридическое лицо (ООО/АО)' },
  { value: 'entrepreneur', label: 'Индивидуальный предприниматель (ИП)' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'individual', label: 'Физическое лицо' },
];

const CURRENCY_OPTIONS = [
  { value: 'RUB', label: 'RUB — Российский рубль' },
  { value: 'USD', label: 'USD — Доллар США' },
  { value: 'EUR', label: 'EUR — Евро' },
];

export function OwnerRequisitesTab({ data }) {
  const { toasts, setToasts } = data;
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [tab, setTab] = useState('ru');

  useEffect(() => {
    loadRequisites();
  }, []);

  async function loadRequisites() {
    setLoading(true);
    try {
      const res = await ownerRequisitesApi.get();
      const requisites = res.requisites || {};
      if (requisites && (requisites.name || requisites.inn || requisites.bank || requisites.foreignAccount?.companyName)) {
        setForm((prev) => ({ ...prev, ...requisites }));
        setHasData(true);
      }
    } catch (err) {
      console.error('[OwnerRequisitesTab:load]', err);
      pushToast('error', 'Не удалось загрузить реквизиты');
    } finally {
      setLoading(false);
    }
  }

  function pushToast(type, message) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name.startsWith('foreignAccount.')) {
      const key = name.replace('foreignAccount.', '');
      setForm((prev) => ({
        ...prev,
        foreignAccount: { ...prev.foreignAccount, [key]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      pushToast('error', 'Введите название / ФИО');
      return;
    }
    setSaving(true);
    try {
      await ownerRequisitesApi.save(form);
      setHasData(true);
      pushToast('success', '✅ Реквизиты сохранены. Изменения применены на юридических страницах.');
    } catch (err) {
      console.error('[OwnerRequisitesTab:save]', err);
      pushToast('error', err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить реквизиты?')) return;
    try {
      await ownerRequisitesApi.delete();
      setForm(INITIAL_FORM);
      setHasData(false);
      pushToast('success', 'Реквизиты удалены');
    } catch (err) {
      console.error('[OwnerRequisitesTab:delete]', err);
      pushToast('error', err.message || 'Ошибка удаления');
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-[var(--text-muted)] animate-pulse">
        Загрузка реквизитов…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text)]">
            <Building2 className="w-6 h-6 text-[#00ff41]" />
            Мои реквизиты
          </h2>
          <p className="text-[var(--text-muted)] mt-1">
            Реквизиты автоматически подставляются в счета, договоры и акты.
          </p>
        </div>
        {hasData && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        )}
      </div>

      {hasData && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Реквизиты заполнены</p>
            <p className="text-sm opacity-80">Они будут использоваться в новых счетах и договорах.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setTab('ru')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ru'
              ? 'border-[#00ff41] text-[#00ff41]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Landmark className="w-4 h-4 inline mr-2" />
          Российские реквизиты
        </button>
        <button
          type="button"
          onClick={() => setTab('foreign')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'foreign'
              ? 'border-[#00ff41] text-[#00ff41]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-2" />
          Зарубежный счёт
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {tab === 'ru' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Тип плательщика</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Название организации / ФИО *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="ООО «Пример» / Иванов Иван Иванович"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">ИНН</label>
              <input
                name="inn"
                value={form.inn}
                onChange={handleChange}
                placeholder="7701234567"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">КПП</label>
              <input
                name="kpp"
                value={form.kpp}
                onChange={handleChange}
                placeholder="770101001"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">ОГРН / ОГРНИП</label>
              <input
                name="ogrn"
                value={form.ogrn}
                onChange={handleChange}
                placeholder="1157746123456"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="finance@company.ru"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Телефон</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+7 (999) 123-45-67"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Генеральный директор / ИП</label>
              <input
                name="director"
                value={form.director}
                onChange={handleChange}
                placeholder="Иванов Иван Иванович"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Юридический адрес</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="г. Москва, ул. Примерная, д. 1, оф. 100"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Банк</label>
              <input
                name="bank"
                value={form.bank}
                onChange={handleChange}
                placeholder="ПАО СБЕРБАНК РОССИИ"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Расчётный счёт</label>
              <input
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                placeholder="40702810100000001234"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">БИК</label>
              <input
                name="bik"
                value={form.bik}
                onChange={handleChange}
                placeholder="044525225"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Корреспондентский счёт</label>
              <input
                name="corrAccount"
                value={form.corrAccount}
                onChange={handleChange}
                placeholder="30101810400000000225"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Валюта по умолчанию</label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Ставка НДС, %</label>
              <input
                name="vatRate"
                type="number"
                min={0}
                max={100}
                value={form.vatRate}
                onChange={handleChange}
                placeholder="20"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Company Name / Beneficiary Name</label>
              <input
                name="foreignAccount.companyName"
                value={form.foreignAccount?.companyName || ''}
                onChange={handleChange}
                placeholder="Example LLC / Ivan Ivanov"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Bank Name</label>
              <input
                name="foreignAccount.bankName"
                value={form.foreignAccount?.bankName || ''}
                onChange={handleChange}
                placeholder="JPMorgan Chase Bank"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">SWIFT / BIC</label>
              <input
                name="foreignAccount.swift"
                value={form.foreignAccount?.swift || ''}
                onChange={handleChange}
                placeholder="CHASUS33"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">IBAN</label>
              <input
                name="foreignAccount.iban"
                value={form.foreignAccount?.iban || ''}
                onChange={handleChange}
                placeholder="GB29 NWBK 6016 1331 9268 19"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Account Number</label>
              <input
                name="foreignAccount.accountNumber"
                value={form.foreignAccount?.accountNumber || ''}
                onChange={handleChange}
                placeholder="000123456789"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Country</label>
              <input
                name="foreignAccount.country"
                value={form.foreignAccount?.country || ''}
                onChange={handleChange}
                placeholder="United Kingdom"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-[var(--text-muted)]">Bank Address</label>
              <input
                name="foreignAccount.bankAddress"
                value={form.foreignAccount?.bankAddress || ''}
                onChange={handleChange}
                placeholder="270 Park Avenue, New York, NY 10017, USA"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00ff41]/50"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#00ff41] text-[#0a0a0f] font-semibold hover:bg-[#00ff41]/90 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение…' : 'Сохранить реквизиты'}
          </button>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); data.setActiveTab('finance'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Перейти к счетам
          </a>
        </div>
      </form>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)]">
        <AlertCircle className="w-5 h-5 mt-0.5 text-[#00ff41]" />
        <div>
          <p className="font-medium text-[var(--text)]">Для чего нужны реквизиты?</p>
          <p className="text-sm mt-1">Они используются при создании счетов, актов и договоров. Данные хранятся в зашифрованном виде и не передаются третьим лицам.</p>
        </div>
      </div>
    </div>
  );
}
