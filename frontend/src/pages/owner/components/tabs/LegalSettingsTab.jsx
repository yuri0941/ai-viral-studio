import { useEffect, useState } from 'react';
import { Scale, Save, AlertCircle, Globe, Mail, Phone, MapPin, Building2, Hash } from 'lucide-react';
import { ownerLegalInfoApi } from '../../../../services/api.js';

const INITIAL_FORM = {
  operatorType: 'self_employed',
  operatorName: '',
  operatorInn: '',
  operatorAddress: '',
  contactEmail: '',
  contactPhone: '',
  siteUrl: 'app.aiviral.studio',
};

const TYPE_OPTIONS = [
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'ip', label: 'Индивидуальный предприниматель (ИП)' },
  { value: 'ooo', label: 'Юридическое лицо (ООО / АО)' },
];

export function LegalSettingsTab({ data }) {
  const { toasts, setToasts } = data;
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadLegalInfo();
  }, []);

  async function loadLegalInfo() {
    setLoading(true);
    try {
      const res = await ownerLegalInfoApi.get();
      const info = res.legalInfo || {};
      if (info && (info.operatorName || info.contactEmail || info.operatorInn)) {
        setForm((prev) => ({ ...prev, ...info }));
        setHasData(true);
      }
    } catch (err) {
      console.error('[LegalSettingsTab:load]', err);
      pushToast('error', 'Не удалось загрузить юридические настройки');
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
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.operatorName.trim()) {
      pushToast('error', 'Введите ФИО / Название оператора');
      return;
    }
    setSaving(true);
    try {
      const res = await ownerLegalInfoApi.save(form);
      if (res.success) {
        setForm((prev) => ({ ...prev, ...res.legalInfo }));
        setHasData(true);
        pushToast('success', 'Юридические настройки сохранены');
      } else {
        pushToast('error', res.error || 'Не удалось сохранить');
      }
    } catch (err) {
      console.error('[LegalSettingsTab:save]', err);
      pushToast('error', err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent)]/10">
          <Scale className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Юридические настройки</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Данные оператора для документов, email и публичных страниц
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)]">
          Эти данные автоматически подставляются в Политику конфиденциальности, Оферту, Email-уведомления и Footer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Тип налогоплательщика</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <select
                name="operatorType"
                value={form.operatorType}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">ФИО / Название оператора</label>
            <input
              type="text"
              name="operatorName"
              value={form.operatorName}
              onChange={handleChange}
              placeholder="Иванов Иван Иванович / ООО «Вайрал»"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Hash className="w-4 h-4" /> ИНН
            </label>
            <input
              type="text"
              name="operatorInn"
              value={form.operatorInn}
              onChange={handleChange}
              placeholder="123456789012"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Юридический адрес
            </label>
            <input
              type="text"
              name="operatorAddress"
              value={form.operatorAddress}
              onChange={handleChange}
              placeholder="г. Москва, ул. Примерная, д. 1"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email для документов и связи
            </label>
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              placeholder="contact@aiviral.studio"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Phone className="w-4 h-4" /> Телефон
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="+7 (999) 000-00-00"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Globe className="w-4 h-4" /> Домен сайта
            </label>
            <input
              type="text"
              name="siteUrl"
              value={form.siteUrl}
              onChange={handleChange}
              placeholder="app.aiviral.studio"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : hasData ? 'Обновить' : 'Сохранить'}
          </button>
          {hasData && (
            <span className="text-sm text-[var(--success)]">Настройки сохранены</span>
          )}
        </div>
      </form>
    </div>
  );
}
