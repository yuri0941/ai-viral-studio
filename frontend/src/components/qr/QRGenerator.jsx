import { useState } from 'react'
import { physicalApi } from '../../services/api.js'
import { QrCode, Upload, Loader2 } from 'lucide-react'

const QR_TYPES = [
    { value: 'link', label: 'Ссылка' },
    { value: 'menu', label: 'Меню' },
    { value: 'vcard', label: 'Визитка' },
    { value: 'promo', label: 'Промо' },
    { value: 'wifi', label: 'WiFi' },
]

export function QRGenerator({ onGenerated, projectId }) {
    const [form, setForm] = useState({
        url: '',
        type: 'link',
        design: { color: '#000000', background: '#ffffff', shape: 'square' },
    })
    const [logoPreview, setLogoPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setLogoPreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const data = await physicalApi.qr.generate({
                url: form.url,
                type: form.type,
                design: { ...form.design, logo: logoPreview },
                projectId,
            })
            setResult(data)
            onGenerated?.(data)
        } catch (err) {
            setError(err.message || 'Ошибка генерации QR')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00ff41]" />
                Генератор QR-кодов
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Тип QR</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                    >
                        {QR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">URL / данные</label>
                    <input
                        type="text"
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Цвет QR</label>
                        <input
                            type="color"
                            value={form.design.color}
                            onChange={(e) => setForm({ ...form, design: { ...form.design, color: e.target.value } })}
                            className="w-full h-10 rounded-xl bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Фон</label>
                        <input
                            type="color"
                            value={form.design.background}
                            onChange={(e) => setForm({ ...form, design: { ...form.design, background: e.target.value } })}
                            className="w-full h-10 rounded-xl bg-transparent"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Логотип (опционально)</label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors text-sm text-white">
                        <Upload className="w-4 h-4" />
                        {logoPreview ? 'Логотип загружен' : 'Загрузить логотип'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    {logoPreview && <img src={logoPreview} alt="logo preview" className="mt-2 w-12 h-12 object-contain rounded-lg" />}
                </div>
                <button
                    type="submit"
                    disabled={loading || !form.url}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] disabled:opacity-50 rounded-xl text-black font-medium text-sm transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    Сгенерировать QR
                </button>
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </form>

            {result && result.data?.dataUrl && (
                <div className="mt-6 p-4 bg-black/30 rounded-xl text-center">
                    <img src={result.data.dataUrl} alt="Generated QR" className="mx-auto w-48 h-48 rounded-xl" />
                    <p className="text-xs text-gray-400 mt-2 break-all">{result.data.redirectUrl}</p>
                </div>
            )}
        </div>
    )
}

export default QRGenerator
