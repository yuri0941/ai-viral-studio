import { useState, useRef, useCallback } from 'react'
import {
    Link2, Search, Sparkles, BarChart, Eye, Heart, MessageCircle, Share2,
    Play, Clock, Hash, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
    Loader2, Download, Copy, ChevronDown, ChevronUp, Star, Zap, Target,
    Users, ThumbsUp, ThumbsDown, Bookmark, ExternalLink, RefreshCw,
    Languages, Lightbulb, Wand2, Scissors, Megaphone, Send, Bot, ImageIcon
} from 'lucide-react'
import { omegaApi } from '../services/api'
import AICoverGenerator from '../components/content/AICoverGenerator'

const LANGUAGES = [
    { id: 'ru', name: 'Русский', flag: '🇷🇺' },
    { id: 'en', name: 'English', flag: '🇬🇧' },
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'zh', name: '中文', flag: '🇨🇳' },
]

const NICHES = [
    'Бизнес / Финансы',
    'Образование / EdTech',
    'Развлечения / Юмор',
    'Фитнес / Спорт',
    'Бьюти / Мода',
    'Технологии / IT',
    'Путешествия',
    'Еда / Кулинария',
    'Игры',
    'Другое'
]

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}

function extractVideoId(url) {
    if (!url) return null
    // youtube.com/watch?v=ID, youtube.com/shorts/ID, youtu.be/ID
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (youtubeMatch) return { platform: 'youtube', id: youtubeMatch[1] }
    // tiktok
    const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/(\d+)/)
    if (tiktokMatch) return { platform: 'tiktok', id: tiktokMatch[1] }
    // instagram reels/posts
    const instaMatch = url.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i)
    if (instaMatch) return { platform: 'instagram', id: instaMatch[1] }
    // twitter/x
    const xMatch = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/)
    if (xMatch) return { platform: 'twitter', id: xMatch[1] }
    return null
}

function isValidUrl(url) {
    return /tiktok|instagram|youtube|youtu\.be|twitter|x\.com/i.test(url)
}

function StatCard({ icon: Icon, label, value, color, subtext }) {
    return (
        <div className="bg-[#1a1a24] rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
        </div>
    )
}

function ScoreRing({ score, size = 80 }) {
    const circumference = 2 * Math.PI * ((size - 8) / 2)
    const offset = circumference - (score / 10) * circumference
    const color = score >= 8 ? '#00ff41' : score >= 6 ? '#fbbf24' : '#ef4444'

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={(size - 8) / 2}
                    fill="none" stroke="#1a1a24" strokeWidth="4"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={(size - 8) / 2}
                    fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color }}>{score}</span>
            </div>
        </div>
    )
}

function AnalysisCard({ title, icon: Icon, items, type = 'neutral', initiallyOpen = true }) {
    const [open, setOpen] = useState(initiallyOpen)
    const border = type === 'good' ? 'border-green-500/10' : type === 'bad' ? 'border-red-500/10' : 'border-white/[0.06]'
    const bg = type === 'good' ? 'bg-green-500/5' : type === 'bad' ? 'bg-red-500/5' : 'bg-[#1a1a24]'
    const iconColor = type === 'good' ? 'text-green-400' : type === 'bad' ? 'text-red-400' : 'text-[#00ff41]'
    const ItemIcon = type === 'good' ? CheckCircle2 : type === 'bad' ? XCircle : Sparkles

    return (
        <div className={`rounded-2xl border ${border} ${bg} p-5`}>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
                </h3>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                            <ItemIcon className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                            <p className="text-sm text-gray-300">{item}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ContentAnalyzerPage() {
    const [url, setUrl] = useState('')
    const [compareUrl, setCompareUrl] = useState('')
    const [niche, setNiche] = useState('Бизнес / Финансы')
    const [language, setLanguage] = useState('ru')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [history, setHistory] = useState([])
    const [aiTab, setAiTab] = useState('description')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiOutput, setAiOutput] = useState('')
    const [aiPrompt, setAiPrompt] = useState('')
    const [coverOpen, setCoverOpen] = useState(false)
    const inputRef = useRef(null)

    const buildMockAnalysis = useCallback((videoUrl, platform, id, isCompare = false) => {
        const thumb = platform === 'youtube'
            ? `https://img.youtube.com/vi/${id}/0.jpg`
            : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop'
        return {
            url: videoUrl,
            platform,
            title: isCompare ? 'Конкурентный ролик: как масштабировать контент' : 'Как я заработал $10,000 за месяц на контенте',
            author: isCompare ? '@competitor' : '@contentcreator',
            thumbnail: thumb,
            duration: '45 сек',
            stats: {
                views: isCompare ? 1200000 : 2450000,
                likes: isCompare ? 98000 : 187000,
                comments: isCompare ? 5400 : 12400,
                shares: isCompare ? 3200 : 8900,
                saves: isCompare ? 2100 : 5600,
                engagementRate: isCompare ? 6.8 : 8.2,
                viralityScore: isCompare ? 7.4 : 9.1,
                watchTime: isCompare ? '68%' : '78%',
            },
            audience: {
                age: { '18-24': 45, '25-34': 32, '35-44': 15, '45+': 8 },
                gender: { male: 38, female: 60, other: 2 },
                topCountries: ['США', 'Россия', 'Германия', 'Великобритания', 'Канада'],
            },
            hooks: isCompare
                ? ['Хук начинается с цифры — «3 способа»', 'Вопрос к аудитории в первые 3 секунды']
                : ['Сильный хук в первые 3 секунды — "Я заработал $10K"', 'Обещание конкретного результата'],
            editing: isCompare
                ? ['Темп средний, есть паузы после 10 сек', 'Использует текстовые вставки на экране']
                : ['Хороший темп монтажа, нет пауз', 'Частая смена кадров держит внимание'],
            cta: isCompare
                ? { text: 'Подпишись на больше советов', placement: 'конец', strength: 'средняя' }
                : { text: 'Подпишись на секреты', placement: 'конец', strength: 'сильная' },
            viralMoments: isCompare
                ? [{ time: '00:04', label: 'Результат' }, { time: '00:18', label: 'Кейс' }]
                : [{ time: '00:02', label: 'Хук' }, { time: '00:12', label: 'Доказательство' }, { time: '00:28', label: 'CTA' }],
            analysis: {
                strengths: isCompare
                    ? ['Хорошая структура повествования', 'Актуальная тема для ниши', 'Присутствуют субтитры']
                    : ['Сильный хук в первые 3 секунды', 'Хороший темп монтажа, нет пауз', 'Чёткий CTA в конце', 'Оптимальная длина для TikTok — 45 сек'],
                weaknesses: isCompare
                    ? ['Слабая обложка', 'Нет призыва к комментарию', 'Мало хештегов']
                    : ['Нет субтитров — теряешь аудиторию без звука', 'Мало эмодзи в описании — снижает CTR', 'Нет хештегов в нише #money #sidehustle', 'Обложка не контрастная, теряется в ленте'],
                recommendations: isCompare
                    ? ['Добавьте хук с цифрой в самое начало', 'Ускорьте темп в середине', 'Добавьте CTA на комментарий']
                    : ['Добавь субтитры — +30% досмотров', 'Используй 3-5 хештегов из топа ниши', 'Сделай обложку с крупным текстом и лицом', 'Добавь серию из 3 видео на эту тему', 'Пости в 19:00-21:00 по времени аудитории'],
                similarVideos: [
                    { title: 'Как я заработал первые $1000', views: '1.2M', score: 8.7, url: '#' },
                    { title: '5 способов монетизировать TikTok', views: '890K', score: 8.3, url: '#' },
                    { title: 'От 0 до $5000 за 30 дней', views: '2.1M', score: 9.2, url: '#' },
                ],
            },
            aiScore: isCompare ? 7.2 : 8.5,
            aiSummary: isCompare
                ? 'Конкурентный ролик хорошо структурирован, но уступает по силе хука и CTA. Есть потенциал для догнать лидера ниши.'
                : 'Видео имеет высокий потенциал вирусности благодаря сильному хуку и актуальной теме. Основные проблемы — отсутствие субтитров и слабая оптимизация под алгоритм.',
        }
    }, [])

    const handleAnalyze = async () => {
        if (!url.trim()) {
            setError('Введите ссылку на видео')
            return
        }
        if (!isValidUrl(url)) {
            setError('Поддерживаются ссылки: TikTok, Instagram, YouTube, YouTube Shorts, Twitter/X, youtu.be')
            return
        }
        if (compareUrl && !isValidUrl(compareUrl)) {
            setError('Некорректная ссылка для сравнения')
            return
        }

        setError('')
        setLoading(true)
        setResult(null)

        const info1 = extractVideoId(url) || { platform: 'unknown', id: 'unknown' }
        const info2 = compareUrl ? extractVideoId(compareUrl) : null

        setTimeout(() => {
            const main = buildMockAnalysis(url, info1.platform, info1.id)
            const compare = info2 ? buildMockAnalysis(compareUrl, info2.platform, info2.id, true) : null
            const final = { ...main, compare, niche, language }
            setResult(final)
            setHistory(prev => [final, ...prev].slice(0, 10))
            setLoading(false)
            // pre-generate SEO block
            generateSEO(final, language)
        }, 2000)
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setUrl(text)
            inputRef.current?.focus()
        } catch {
            setError('Не удалось получить доступ к буферу обмена')
        }
    }

    const generateSEO = useCallback(async (analysis, lang) => {
        const prompt = `Напиши SEO-описание и 10 хештегов для видео "${analysis.title}" на языке ${lang === 'ru' ? 'русском' : lang === 'es' ? 'испанском' : lang === 'zh' ? 'китайском' : 'английском'}. Ниша: ${analysis.niche}.`
        try {
            const res = await omegaApi.chat(prompt, [])
            setAiOutput(res?.data?.response || '')
        } catch {
            const labels = { ru: 'Описание', en: 'Description', es: 'Descripción', zh: '描述' }
            setAiOutput(`${labels[lang]}: ${analysis.title}\n\n#viral #content #ai #trending #${analysis.platform} #marketing #growth #socialmedia #creator #tips`)
        }
    }, [])

    const runAIAssistant = useCallback(async () => {
        if (!aiPrompt.trim() || !result) return
        setAiLoading(true)
        try {
            const context = `Видео: "${result.title}", платформа ${result.platform}, ниша ${result.niche}, оценка ${result.aiScore}.`
            const res = await omegaApi.chat(`${context}\n\n${aiPrompt}`, [])
            setAiOutput(res?.data?.response || '')
        } catch {
            setAiOutput('Не удалось получить ответ от AI. Проверьте API-ключи или попробуйте позже.')
        } finally {
            setAiLoading(false)
        }
    }, [aiPrompt, result])

    const generateTitles = useCallback(async () => {
        if (!result) return
        setAiLoading(true)
        try {
            const res = await omegaApi.chat(
                `Придумай 5 вариантов названий для видео "${result.title}" на языке ${language === 'ru' ? 'русском' : language === 'es' ? 'испанском' : language === 'zh' ? 'китайском' : 'английском'}. Для каждого укажи кликбейт-оценку 1-10.`, []
            )
            setAiOutput(res?.data?.response || '')
            setAiTab('titles')
        } catch {
            setAiOutput('1. "Как я заработал $10K за 30 дней" — кликбейт 9/10\n2. "3 секрета вирусного контента" — 8/10\n3. "От 0 до $10K: мой путь" — 7/10\n4. "Это изменило мой доход" — 8/10\n5. "Почему 90% роликов проваливаются" — 9/10')
            setAiTab('titles')
        } finally {
            setAiLoading(false)
        }
    }, [language, result])

    const generateTags = useCallback(async () => {
        if (!result) return
        setAiLoading(true)
        try {
            const res = await omegaApi.chat(
                `Сгенерируй хештеги для видео "${result.title}" на 4 языках: RU, EN, ES, ZH. Раздели списки.`, []
            )
            setAiOutput(res?.data?.response || '')
            setAiTab('tags')
        } catch {
            setAiOutput('RU: #вирусныйконтент #бизнес #монетизация #тикток #инфобизнес\nEN: #viralcontent #business #monetization #tiktok #creator\nES: #contenidoviral #negocios #monetización #tiktok #creador\nZH: #病毒内容 #商业 #变现 #抖音 #创作者')
            setAiTab('tags')
        } finally {
            setAiLoading(false)
        }
    }, [result])

    const platforms = [
        { id: 'tiktok', name: 'TikTok', color: '#00f2ea', icon: 'T' },
        { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'I' },
        { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'Y' },
        { id: 'twitter', name: 'Twitter/X', color: '#1DA1F2', icon: 'X' },
    ]

    const AI_TAB_LABELS = {
        description: { label: 'SEO + хештеги', icon: Hash },
        titles: { label: 'Названия', icon: Lightbulb },
        tags: { label: 'Теги RU/EN/ES/ZH', icon: Languages },
        chat: { label: 'AI чат', icon: Bot },
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Link2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Анализ контента</h1>
                        <p className="text-gray-400 text-sm">Вставь ссылку — получи полный AI-разбор + SEO + сравнение с конкурентом</p>
                    </div>
                </div>
            </div>

            {/* URL Input */}
            <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-6 mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {platforms.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400">
                            <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: p.color + '30', color: p.color }}>
                                {p.icon}
                            </span>
                            {p.name}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            placeholder="https://www.youtube.com/shorts/AbCdEfGhIjK или TikTok/Instagram..."
                            className="w-full px-4 py-3 pl-11 bg-[#252530] rounded-xl border border-white/10 focus:border-[#00ff41] outline-none text-sm transition-all"
                        />
                        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={compareUrl}
                            onChange={(e) => setCompareUrl(e.target.value)}
                            placeholder="Ссылка для сравнения (опционально)"
                            className="w-full px-4 py-3 pl-11 bg-[#252530] rounded-xl border border-white/10 focus:border-[#00ff41] outline-none text-sm transition-all"
                        />
                        <BarChart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative">
                            <select
                                value={niche}
                                onChange={e => setNiche(e.target.value)}
                                className="appearance-none bg-[#252530] border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white outline-none focus:border-[#00ff41]"
                            >
                                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={language}
                                onChange={e => {
                                    setLanguage(e.target.value)
                                    if (result) generateSEO(result, e.target.value)
                                }}
                                className="appearance-none bg-[#252530] border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white outline-none focus:border-[#00ff41]"
                            >
                                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                            </select>
                            <Languages className="absolute right-2.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePaste}
                            className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm text-gray-400 hover:text-white"
                        >
                            Вставить
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="px-6 py-3 bg-[#00ff41] hover:bg-[#00cc33] text-black font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Анализ...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Анализировать</>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-12 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-2 border-[#00ff41]/20 rounded-full" />
                        <div className="absolute inset-0 border-2 border-[#00ff41] rounded-full border-t-transparent animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-[#00ff41]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI анализирует контент...</h3>
                    <p className="text-gray-400 text-sm">Сканируем метрики, аудиторию, паттерны вирусности, SEO и хуки</p>
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
                        {['Сбор метрик', 'Анализ хука', 'Динамика монтажа', 'Оценка CTA', 'SEO-оптимизация'].map((step, i) => (
                            <div key={step} className="flex items-center gap-2 text-xs text-gray-500">
                                <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-[#00ff41] animate-pulse' : 'bg-gray-700'}`} />
                                {step}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="space-y-6">
                    {/* Comparison banner */}
                    {result.compare && (
                        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart className="w-4 h-4 text-blue-400" /> Сравнение с конкурентом</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="text-xs text-gray-500 mb-1">AI Оценка</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">{result.aiScore}</span>
                                        <span className="text-gray-600">vs</span>
                                        <span className="text-lg font-bold text-gray-400">{result.compare.aiScore}</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Вирусность</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">{result.stats.viralityScore}</span>
                                        <span className="text-gray-600">vs</span>
                                        <span className="text-lg font-bold text-gray-400">{result.compare.stats.viralityScore}</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Engagement</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">{result.stats.engagementRate}%</span>
                                        <span className="text-gray-600">vs</span>
                                        <span className="text-lg font-bold text-gray-400">{result.compare.stats.engagementRate}%</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Досмотр</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">{result.stats.watchTime}</span>
                                        <span className="text-gray-600">vs</span>
                                        <span className="text-lg font-bold text-gray-400">{result.compare.stats.watchTime}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Video Preview + Main Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-[#1a1a24] rounded-2xl border border-white/[0.06] overflow-hidden">
                            <div className="relative aspect-[9/16] max-h-[400px] bg-black">
                                <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded bg-[#00ff41]/20 text-[#00ff41] text-[10px] font-bold uppercase">{result.platform}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-300"><Clock className="w-3 h-3" /> {result.duration}</span>
                                    </div>
                                    <h3 className="text-sm font-semibold line-clamp-2">{result.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{result.author}</p>
                                </div>
                                <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#00ff41]/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-black ml-1" fill="black" />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-400">AI Оценка</span>
                                    <ScoreRing score={result.aiScore} size={50} />
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">{result.aiSummary}</p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <StatCard icon={Eye} label="Просмотры" value={formatNumber(result.stats.views)} color="text-blue-400" />
                                <StatCard icon={Heart} label="Лайки" value={formatNumber(result.stats.likes)} color="text-red-400" />
                                <StatCard icon={MessageCircle} label="Комментарии" value={formatNumber(result.stats.comments)} color="text-green-400" />
                                <StatCard icon={Share2} label="Репосты" value={formatNumber(result.stats.shares)} color="text-purple-400" />
                                <StatCard icon={Bookmark} label="Сохранения" value={formatNumber(result.stats.saves)} color="text-yellow-400" />
                                <StatCard icon={Target} label="Engagement" value={result.stats.engagementRate + '%'} color="text-[#00ff41]" subtext="Выше среднего на 23%" />
                                <StatCard icon={Zap} label="Вирусность" value={result.stats.viralityScore + '/10'} color="text-orange-400" subtext="Топ 5% ниши" />
                                <StatCard icon={Clock} label="Досмотр" value={result.stats.watchTime} color="text-cyan-400" subtext="Отличный показатель" />
                            </div>

                            {/* Audience */}
                            <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5">
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#00ff41]" /> Аудитория</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Возраст</p>
                                        <div className="space-y-2">
                                            {Object.entries(result.audience.age).map(([age, pct]) => (
                                                <div key={age} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-10">{age}</span>
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-[#00ff41] rounded-full" style={{ width: pct + '%' }} /></div>
                                                    <span className="text-xs text-white w-8 text-right">{pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Пол</p>
                                        <div className="space-y-2">
                                            {Object.entries(result.audience.gender).map(([g, pct]) => (
                                                <div key={g} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-14 capitalize">{g === 'male' ? 'Муж' : g === 'female' ? 'Жен' : 'Др.'}</span>
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: pct + '%', backgroundColor: g === 'male' ? '#3b82f6' : g === 'female' ? '#ec4899' : '#a855f7' }} /></div>
                                                    <span className="text-xs text-white w-8 text-right">{pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Топ страны</p>
                                        <div className="space-y-1.5">
                                            {result.audience.topCountries.map((country, i) => (
                                                <div key={country} className="flex items-center gap-2 text-xs">
                                                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-400">{i + 1}</span>
                                                    <span className="text-gray-300">{country}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hook / Editing / CTA / Viral moments */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnalysisCard title="Хуки (первые 3 сек)" icon={Zap} items={result.hooks} type="good" />
                        <AnalysisCard title="Динамика монтажа" icon={Scissors} items={result.editing} type="neutral" />
                        <AnalysisCard title="CTA — призыв к действию" icon={Megaphone} items={[`Текст: "${result.cta.text}"`, `Место: ${result.cta.placement}`, `Сила: ${result.cta.strength}`]} type="good" />
                        <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-400" /> Вирусные моменты</h3>
                            <div className="space-y-2">
                                {result.viralMoments.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-mono">{m.time}</span>
                                            <span className="text-sm text-gray-300">{m.label}</span>
                                        </div>
                                        <Play size={14} className="text-gray-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Strengths / Weaknesses / Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnalysisCard title="Сильные стороны" icon={ThumbsUp} items={result.analysis.strengths} type="good" />
                        <AnalysisCard title="Слабые стороны" icon={ThumbsDown} items={result.analysis.weaknesses} type="bad" />
                    </div>
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#00ff41]" /> Рекомендации AI</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {result.analysis.recommendations.map((rec, i) => (
                                <div key={i} className="p-4 rounded-xl bg-[#00ff41]/5 border border-[#00ff41]/10 hover:border-[#00ff41]/30 transition-all group">
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-[#00ff41]/20 flex items-center justify-center text-[#00ff41] text-xs font-bold shrink-0">{i + 1}</div>
                                        <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{rec}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Assistant Panel */}
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-purple-400" /> AI-помощник по контенту</h3>
                            <button
                                onClick={() => setCoverOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                <ImageIcon size={12} /> AI Обложка
                            </button>
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                {Object.entries(AI_TAB_LABELS).map(([key, { label, icon: Icon }]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setAiTab(key)
                                            if (key === 'description') generateSEO(result, language)
                                            if (key === 'titles') generateTitles()
                                            if (key === 'tags') generateTags()
                                            if (key === 'chat') setAiOutput('')
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors ${aiTab === key ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Icon size={12} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {aiTab !== 'chat' ? (
                            <div className="space-y-3">
                                <div className="min-h-[120px] p-4 rounded-xl bg-[#0a0a0f] border border-white/10 text-sm text-gray-300 whitespace-pre-line">
                                    {aiLoading ? (
                                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Генерация...</div>
                                    ) : aiOutput || 'Нажмите кнопку сгенерировать, чтобы получить варианты.'}
                                </div>
                                <div className="flex gap-2">
                                    {aiTab === 'description' && <button onClick={() => generateSEO(result, language)} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"><Wand2 size={14} /> Сгенерировать SEO</button>}
                                    {aiTab === 'titles' && <button onClick={generateTitles} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"><Lightbulb size={14} /> Новые названия</button>}
                                    {aiTab === 'tags' && <button onClick={generateTags} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"><Hash size={14} /> Мультиязычные теги</button>}
                                    {aiOutput && (
                                        <button onClick={() => navigator.clipboard.writeText(aiOutput)} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1.5"><Copy size={14} /> Копировать</button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="min-h-[120px] p-4 rounded-xl bg-[#0a0a0f] border border-white/10 text-sm text-gray-300 whitespace-pre-line">
                                    {aiLoading ? (
                                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> OMEGA думает...</div>
                                    ) : aiOutput || 'Задайте вопрос AI об этом видео, ниши или идеях для контента.'}
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); runAIAssistant() }} className="flex gap-2">
                                    <input
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        placeholder="Например: предложи 3 идеи для следующего ролика..."
                                        className="flex-1 px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                                    />
                                    <button type="submit" disabled={aiLoading} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"><Send size={16} /></button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Similar Videos */}
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> Похожие успешные видео</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {result.analysis.similarVideos.map((video, i) => (
                                <a key={i} href={video.url} className="p-4 rounded-xl bg-white/5 border border-white/[0.06] hover:border-purple-500/30 hover:bg-white/[0.03] transition-all group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">{video.views} просмотров</span>
                                        <ScoreRing score={video.score} size={36} />
                                    </div>
                                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2">{video.title}</p>
                                    <div className="flex items-center gap-1 mt-2 text-xs text-purple-400"><ExternalLink className="w-3 h-3" /> Открыть</div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pb-6">
                        <button onClick={handleAnalyze} className="flex items-center gap-2 px-5 py-2.5 bg-[#00ff41] hover:bg-[#00cc33] text-black font-medium rounded-xl transition-all hover:scale-[1.02]"><RefreshCw className="w-4 h-4" /> Переанализировать</button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/[0.06]"><Download className="w-4 h-4" /> Скачать отчёт PDF</button>
                        <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/[0.06]"><Copy className="w-4 h-4" /> Копировать ссылку</button>
                    </div>
                </div>
            )}

            {coverOpen && (
                <AICoverGenerator
                    onClose={() => setCoverOpen(false)}
                    onUse={(cover) => {
                        setAiOutput(prev => prev + `\n\n[AI Обложка: ${cover.url}]`)
                    }}
                />
            )}

            {/* History */}
            {history.length > 0 && !result && !loading && (
                <div className="mt-8">
                    <h3 className="text-sm font-semibold mb-3 text-gray-400">История анализа</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {history.map((item, i) => (
                            <button key={i} onClick={() => setResult(item)} className="p-4 rounded-xl bg-[#1a1a24] border border-white/[0.06] hover:border-white/[0.1] text-left transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 uppercase">{item.platform}</span>
                                    <ScoreRing score={item.aiScore} size={28} />
                                </div>
                                <p className="text-sm text-gray-300 line-clamp-2">{item.title}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContentAnalyzerPage
