import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config.js'
import {
    Plus, TrendingUp, Eye, MousePointer, Percent, DollarSign,
    Calendar, MessageSquare, FileText, Download, Mail, CheckCircle,
    XCircle, Pause, Play, BarChart as BarChartIcon, PieChart, ArrowUpRight,
    ArrowDownRight, Users, Target, Clock, ChevronDown, ChevronUp,
    Send, Paperclip, Image, Video, FileType, Printer, Search, Filter,
    Brain, Loader2, Wand2, Wallet
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
    BarChart, Bar, Legend
} from 'recharts'
import { AdStudioTab } from './advertiser/AdStudioTab'

function AdvertiserDashboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    // [P18] added: AdStudio is the first/default tab
    const [activeTab, setActiveTab] = useState('adstudio')
    const [showModal, setShowModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [selectedCampaign, setSelectedCampaign] = useState(null)
    const [chatMessages, setChatMessages] = useState([
        { id: 1, client: 'SportLife', from: 'client', text: 'Здравствуйте! Хотел бы разместить рекламу на неделю.', time: '10:30', read: true },
        { id: 2, client: 'SportLife', from: 'advertiser', text: 'Добрый день! Конечно, расскажите подробнее о вашем продукте.', time: '10:32', read: true },
        { id: 3, client: 'SportLife', from: 'client', text: 'Это новый фитнес-трекер. Целевая аудитория — 18-35 лет.', time: '10:35', read: true },
        { id: 4, client: 'SportLife', from: 'owner', text: 'Я посмотрел бриф. Бюджет $5000 подходит. Готов утвердить.', time: '10:40', read: false },
    ])
    const [newMessage, setNewMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [analyticsOpen, setAnalyticsOpen] = useState(false)
    const [activeChatClient, setActiveChatClient] = useState('SportLife')

    // [P18] added: Neuro-Sales analysis state
    const [neuroOpen, setNeuroOpen] = useState(false)
    const [neuroLoading, setNeuroLoading] = useState(false)
    const [neuroResult, setNeuroResult] = useState(null)
    const [neuroProduct, setNeuroProduct] = useState('фитнес-трекер')
    const [neuroGoal, setNeuroGoal] = useState('продажа')

    // [P20] added: revenue share state
    const [revenueShare, setRevenueShare] = useState({
        totalSpend: 0,
        totalRevenueShare: 0,
        platformRate: 0.05,
        pendingPayout: 0,
        paidOut: 0,
        payoutThreshold: 100,
    })

    useEffect(() => {
        async function loadRevenueShare() {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE_URL}/owner/revenue-share`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.status === 'success' && data.data) {
                    setRevenueShare(data.data)
                }
            } catch (err) {
                console.warn('[AdvertiserDashboard] revenue share load failed:', err.message)
            }
        }
        loadRevenueShare()
    }, [])

    const [campaigns, setCampaigns] = useState([])

    useEffect(() => {
        async function loadCampaigns() {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE_URL}/campaigns`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const json = await res.json()
                if (json && Array.isArray(json.data)) {
                    setCampaigns(json.data)
                } else if (Array.isArray(json)) {
                    setCampaigns(json)
                }
            } catch (err) {
                console.warn('[AdvertiserDashboard] campaigns load failed:', err.message)
            }
        }
        loadCampaigns()
    }, [])

    const [newCampaign, setNewCampaign] = useState({
        name: '',
        budget: '',
        target: '',
        description: '',
        startDate: '',
        endDate: '',
        format: 'banner',
        client: ''
    })

    const normalizeCampaign = (c) => ({
        id: c.id ?? 0,
        name: c.name || '',
        client: c.client || '',
        status: c.status || 'draft',
        format: c.format || 'banner',
        budget: c.budget ?? 0,
        spent: c.spent ?? 0,
        ctr: c.ctr ?? 0,
        roi: c.roi ?? 0,
        impressions: c.impressions ?? 0,
        clicks: c.clicks ?? 0,
        conversions: c.conversions ?? 0,
        startDate: c.startDate || '',
        endDate: c.endDate || '',
        approved: !!c.approved,
    })

    const campaignsList = useMemo(() => campaigns.map(normalizeCampaign), [campaigns])

    const [tariffs] = useState([
        { name: 'CPM', price: 5, desc: t('advertiser.cpmDesc', 'За 1000 показов'), icon: Eye },
        { name: 'CPC', price: 0.50, desc: t('advertiser.cpcDesc', 'За клик'), icon: MousePointer },
        { name: 'CPA', price: 10, desc: t('advertiser.cpaDesc', 'За действие'), icon: Target },
        { name: t('advertiser.fix', 'Фикс'), price: 500, desc: t('advertiser.fixDesc', 'Фиксированная ставка'), icon: DollarSign },
    ])

    const chartData = [
        { name: 'Пн', impressions: 4000, clicks: 120, conversions: 8 },
        { name: 'Вт', impressions: 5200, clicks: 180, conversions: 12 },
        { name: 'Ср', impressions: 4800, clicks: 150, conversions: 10 },
        { name: 'Чт', impressions: 6100, clicks: 220, conversions: 15 },
        { name: 'Пт', impressions: 7500, clicks: 280, conversions: 20 },
        { name: 'Сб', impressions: 8900, clicks: 350, conversions: 25 },
        { name: 'Вс', impressions: 7200, clicks: 290, conversions: 18 },
    ]

    const pieData = [
        { name: t('advertiser.banner'), value: 45, color: 'var(--success)' },
        { name: t('advertiser.video'), value: 30, color: 'var(--accent)' },
        { name: t('advertiser.native'), value: 15, color: 'var(--primary)' },
        { name: t('advertiser.stories'), value: 10, color: 'var(--accent-warm)' },
    ]

    const totalStats = {
        totalBudget: campaignsList.reduce((s, c) => s + c.budget, 0),
        totalSpent: campaignsList.reduce((s, c) => s + c.spent, 0),
        totalImpressions: campaignsList.reduce((s, c) => s + c.impressions, 0),
        totalClicks: campaignsList.reduce((s, c) => s + c.clicks, 0),
        totalConversions: campaignsList.reduce((s, c) => s + c.conversions, 0),
        avgCtr: campaignsList.length ? (campaignsList.reduce((s, c) => s + c.ctr, 0) / campaignsList.length).toFixed(1) : '0.0',
        avgRoi: campaignsList.length ? (campaignsList.reduce((s, c) => s + c.roi, 0) / campaignsList.length).toFixed(0) : '0',
    }

    const profit = totalStats.totalBudget - totalStats.totalSpent

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30'
            case 'paused': return 'bg-[var(--accent-warm)]/20 text-[var(--accent-warm)] border-[var(--accent-warm)]/30'
            case 'ended': return 'bg-[var(--text-muted)]/20 text-[var(--text-muted)] border-[var(--text-muted)]/30'
            default: return 'bg-[var(--text-muted)]/20 text-[var(--text-muted)] border-[var(--text-muted)]/30'
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return t('advertiser.statusActive')
            case 'paused': return t('advertiser.statusPaused')
            case 'ended': return t('advertiser.statusEnded')
            default: return status
        }
    }

    const getFormatIcon = (format) => {
        switch (format) {
            case 'banner': return <Image className="w-4 h-4" />
            case 'video': return <Video className="w-4 h-4" />
            case 'native': return <FileText className="w-4 h-4" />
            default: return <FileType className="w-4 h-4" />
        }
    }

    const filteredCampaigns = campaignsList.filter(c => {
        const q = searchQuery.toLowerCase()
        const matchesSearch = c.name.toLowerCase().includes(q) || c.client.toLowerCase().includes(q)
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const toggleCampaignStatus = (id) => {
        setCampaigns(prev => prev.map(c => {
            if (c.id !== id) return c
            const next = c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status
            return { ...c, status: next }
        }))
    }

    const openAnalytics = (camp) => {
        setSelectedCampaign(camp)
        setAnalyticsOpen(true)
    }

    const handleCreateCampaign = (e) => {
        e.preventDefault()
        const campaign = {
            id: Date.now(),
            name: newCampaign.name,
            status: 'active',
            budget: parseInt(newCampaign.budget) || 1000,
            spent: 0,
            ctr: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            roi: 0,
            startDate: newCampaign.startDate,
            endDate: newCampaign.endDate,
            format: newCampaign.format,
            client: newCampaign.client,
            approved: false
        }
        setCampaigns(prev => [...prev, campaign])
        setShowModal(false)
        setNewCampaign({ name: '', budget: '', target: '', description: '', startDate: '', endDate: '', format: 'banner', client: '' })
    }

    const handleSendMessage = (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return
        const msg = {
            id: chatMessages.length + 1,
            client: activeChatClient,
            from: 'advertiser',
            text: newMessage,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            read: false
        }
        setChatMessages([...chatMessages, msg])
        setNewMessage('')
    }

    // [P18] added: Neuro-Sales audience psychotype analysis
    async function handleAnalyzePsychotype() {
        setNeuroLoading(true)
        try {
            const token = localStorage.getItem('token')
            const history = chatMessages.filter(m => m.client === activeChatClient)
            const res = await fetch(`${API_BASE_URL}/neuro-sales/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ chatHistory: history, product: neuroProduct, goal: neuroGoal }),
            })
            const json = await res.json()
            if (json.success) setNeuroResult(json.data)
        } catch (err) {
            console.error('[AdvertiserDashboard:neuroSales]', err)
        } finally {
            setNeuroLoading(false)
        }
    }

    const handleExport = (format) => {
        const data = campaignsList.map(c => ({
            [t('advertiser.campaignName')]: c.name,
            [t('advertiser.client')]: c.client,
            [t('common.status')]: getStatusLabel(c.status),
            [t('advertiser.budgetLabel')]: c.budget,
            [t('advertiser.spent')]: c.spent,
            [t('advertiser.impressions')]: c.impressions,
            [t('advertiser.clicks')]: c.clicks,
            [t('advertiser.ctr')]: c.ctr + '%',
            [t('advertiser.conversions')]: c.conversions,
            [t('advertiser.avgRoi')]: c.roi + '%',
            [t('advertiser.startDate')]: c.startDate,
            [t('advertiser.endDate')]: c.endDate,
        }))

        if (format === 'csv') {
            const headers = Object.keys(data[0]).join(';')
            const rows = data.map(row => Object.values(row).join(';')).join('\n')
            const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'advertiser-report.csv'
            link.click()
        } else if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'advertiser-report.json'
            link.click()
        }
        setShowReportModal(false)
    }

    const handleSendEmail = () => {
        const subject = t('advertiser.emailSubject', 'Отчёт по рекламным кампаниям — AI Viral Studio')
        const body = t('advertiser.emailBody', `Здравствуйте!

Отчёт по рекламным кампаниям:
• Всего кампаний: {{count}}
• Общий бюджет: ${{budget}}
• Потрачено: ${{spent}}
• Прибыль: ${{profit}}
• Средний CTR: {{ctr}}%
• Средний ROI: {{roi}}%

С уважением,
AI Viral Studio`, {
            count: campaignsList.length,
            budget: totalStats.totalBudget.toLocaleString(),
            spent: totalStats.totalSpent.toLocaleString(),
            profit: profit.toLocaleString(),
            ctr: totalStats.avgCtr,
            roi: totalStats.avgRoi
        })
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        setShowReportModal(false)
    }

    const tabs = [
        // [P18] added: AdStudio as first tab
        { id: 'adstudio', label: t('advertiser.adStudio'), icon: Wand2 },
        { id: 'campaigns', label: t('advertiser.campaigns'), icon: Target },
        { id: 'calendar', label: t('advertiser.calendar'), icon: Calendar },
        { id: 'chat', label: t('advertiser.chat'), icon: MessageSquare },
        { id: 'reports', label: t('advertiser.reports'), icon: BarChartIcon },
        { id: 'tariffs', label: t('advertiser.tariffs'), icon: DollarSign },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] flex items-center gap-3">
                        <TrendingUp className="w-7 h-7 text-[var(--success)]" />
                        {t('advertiser.title')}
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">{t('advertiser.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('advertiser.newCampaign')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: t('advertiser.totalBudget'), value: `$${totalStats.totalBudget.toLocaleString()}`, icon: DollarSign, gradient: 'from-sky-500 to-blue-600' },
                    { label: t('advertiser.spent'), value: `$${totalStats.totalSpent.toLocaleString()}`, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600' },
                    { label: t('advertiser.profit'), value: `$${profit.toLocaleString()}`, icon: DollarSign, gradient: profit >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600' },
                    { label: t('advertiser.avgRoi'), value: `${totalStats.avgRoi}%`, icon: Percent, gradient: 'from-violet-500 to-fuchsia-600' },
                ].map((stat, i) => (
                    <div key={i} className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                            <stat.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stat.value}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                    { label: t('advertiser.impressions'), value: totalStats.totalImpressions.toLocaleString(), icon: Eye },
                    { label: t('advertiser.clicks'), value: totalStats.totalClicks.toLocaleString(), icon: MousePointer },
                    { label: t('advertiser.ctr'), value: `${totalStats.avgCtr}%`, icon: Percent },
                    { label: t('advertiser.conversions'), value: totalStats.totalConversions, icon: CheckCircle },
                    { label: t('advertiser.campaigns'), value: campaignsList.length, icon: Target },
                    { label: t('advertiser.clients'), value: [...new Set(campaignsList.map(c => c.client))].length, icon: Users },
                ].map((stat, i) => (
                    <div key={i} className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-3 text-center hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                        <stat.icon className="w-4 h-4 text-[var(--text-muted)] mx-auto mb-1.5" />
                        <p className="text-sm font-semibold text-[var(--text)]">{stat.value}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* [P20] added: Revenue Share card */}
            <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text)]">Revenue Share</h3>
                        <p className="text-xs text-[var(--text-muted)]">{Math.round(revenueShare.platformRate * 100)}% от ad spend → платформе</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-xs text-[var(--text-muted)]">Всего расходов</p>
                        <p className="text-lg font-bold text-[var(--text)]">${revenueShare.totalSpend.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Доля платформы</p>
                        <p className="text-xl font-bold text-[var(--accent-warm)]">${revenueShare.totalRevenueShare.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Выплачено</p>
                        <p className="text-xl font-bold text-[var(--success)]">${revenueShare.paidOut.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Ожидает выплаты</p>
                        <p className="text-xl font-bold text-[var(--primary)]">${revenueShare.pendingPayout.toLocaleString()}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Прогресс к порогу выплаты (${revenueShare.payoutThreshold})</span>
                        <span>{Math.min(100, Math.round((revenueShare.pendingPayout / revenueShare.payoutThreshold) * 100))}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--success)] to-[var(--primary)]"
                            style={{ width: `${Math.min(100, Math.round((revenueShare.pendingPayout / revenueShare.payoutThreshold) * 100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'text-[var(--success)] border-b-2 border-[var(--success)] bg-[var(--success)]/5'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ADSTUDIO TAB */}
            {activeTab === 'adstudio' && <AdStudioTab />}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
                <div className="space-y-4">
                    <div className="glass overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                                <Target className="w-5 h-5 text-[var(--success)]" />
                                {t('advertiser.myCampaigns')}
                            </h2>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] text-xs hover:bg-[var(--primary-soft)] transition-colors flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {t('advertiser.export')}
                            </button>
                        </div>
                        <div className="p-3 border-b border-[var(--border)] flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('advertiser.searchCampaigns')}
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                {[
                                    { id: 'all', label: t('advertiser.all') },
                                    { id: 'active', label: t('advertiser.active') },
                                    { id: 'paused', label: t('advertiser.paused') },
                                    { id: 'ended', label: t('advertiser.ended') },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setFilterStatus(s.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            filterStatus === s.id
                                                ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
                                                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)] border border-transparent'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {campaignsList.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mb-4">
                                    <Target className="w-8 h-8 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-[var(--text)] font-semibold mb-2">Создайте первую кампанию</p>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Новая кампания
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* [P16-FIX] added: masonry campaigns grid with glass cards + preview + status chip */}
                                <div className="p-4 columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                                    {filteredCampaigns.map((camp) => {
                                        const progress = Math.min(100, (camp.spent / camp.budget) * 100)
                                        return (
                                            <div
                                                key={camp.id}
                                                className="break-inside-avoid group relative luxury-card overflow-hidden hover:border-[var(--primary)]/30 transition-all duration-300"
                                            >
                                                {/* Cover image 16:9 preview */}
                                                <div className="relative aspect-video bg-gradient-to-br from-[var(--surface)] to-[var(--bg-secondary)]">
                                                    <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                                                        {getFormatIcon(camp.format)}
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                                        <button onClick={() => openAnalytics(camp)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                                                            <BarChartIcon size={18} />
                                                        </button>
                                                        <button onClick={() => toggleCampaignStatus(camp.id)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                                                            {camp.status === 'active' ? <Pause size={18} /> : camp.status === 'paused' ? <Play size={18} /> : <CheckCircle size={18} />}
                                                        </button>
                                                        <button onClick={() => { setSelectedCampaign(camp); setShowModal(true) }} className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                                                            <FileText size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="absolute top-3 left-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(camp.status)}`}>
                                                            {camp.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />}
                                                            {getStatusLabel(camp.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-[var(--text)]">{camp.name}</h3>
                                                            <p className="text-xs text-[var(--text-muted)]">{camp.client}</p>
                                                        </div>
                                                        {camp.approved ? (
                                                            <CheckCircle size={16} className="text-[var(--success)]" />
                                                        ) : (
                                                            <Clock size={16} className="text-[var(--accent-warm)]" />
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                                        <div className="text-center p-2 rounded-xl bg-[var(--surface)]">
                                                            <p className="text-xs text-[var(--text-muted)]">{t('advertiser.ctr')}</p>
                                                            <p className="text-sm font-semibold text-[var(--text)]">{camp.ctr}%</p>
                                                        </div>
                                                        <div className="text-center p-2 rounded-xl bg-[var(--surface)]">
                                                            <p className="text-xs text-[var(--text-muted)]">{t('advertiser.avgRoi')}</p>
                                                            <p className={`text-sm font-semibold ${camp.roi >= 100 ? 'text-[var(--success)]' : 'text-[var(--accent-warm)]'}`}>{camp.roi}%</p>
                                                        </div>
                                                        <div className="text-center p-2 rounded-xl bg-[var(--surface)]">
                                                            <p className="text-xs text-[var(--text-muted)]">{t('advertiser.clicks')}</p>
                                                            <p className="text-sm font-semibold text-[var(--text)]">{camp.clicks.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-[var(--text-muted)]">{t('advertiser.budget')}</span>
                                                            <span className="text-[var(--text)]">${camp.spent.toLocaleString()} / ${camp.budget.toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-[var(--success)] to-[var(--accent)] rounded-full" style={{ width: `${progress}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Analytics row charts + stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="glass p-4">
                            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                                {t('advertiser.dynamicsTitle')}
                            </h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClk" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '8px' }}
                                    />
                                    <Area type="monotone" dataKey="impressions" stroke="var(--success)" fillOpacity={1} fill="url(#colorImp)" name={t('advertiser.impressions')} />
                                    <Area type="monotone" dataKey="clicks" stroke="var(--accent)" fillOpacity={1} fill="url(#colorClk)" name={t('advertiser.clicks')} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass p-4">
                            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-[var(--success)]" />
                                {t('advertiser.distributionTitle')}
                            </h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <RePieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '8px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
                <div className="glass p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[var(--success)]" />
                        {t('advertiser.calendarTitle')}
                    </h2>
                    <div className="space-y-3">
                        {campaignsList.map(camp => (
                            <div key={camp.id} className="flex items-center gap-4 p-4 rounded-xl glass hover:bg-[var(--surface)] transition-colors">
                                <div className={`w-3 h-3 rounded-full ${camp.status === 'active' ? 'bg-[var(--success)]' : camp.status === 'paused' ? 'bg-amber-400' : 'bg-[var(--text-muted)]'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[var(--text)] text-sm font-medium truncate">{camp.name}</p>
                                    <p className="text-[var(--text-muted)] text-xs">{camp.client}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[var(--text-muted)] text-xs">{camp.startDate} — {camp.endDate}</p>
                                    <p className="text-[var(--text-muted)] text-xs">{Math.ceil((new Date(camp.endDate) - new Date(camp.startDate)) / (1000 * 60 * 60 * 24))} {t('advertiser.days')}</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-[var(--text)] text-sm font-semibold">${camp.budget.toLocaleString()}</p>
                                    <p className="text-[var(--text-muted)] text-xs">{t('advertiser.budget').toLowerCase()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="glass overflow-hidden flex flex-col sm:flex-row h-[500px]">
                    {/* Client list */}
                    <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-[var(--border)] flex flex-col shrink-0">
                        <div className="p-3 border-b border-[var(--border)]">
                            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                                <Users className="w-4 h-4 text-[var(--success)]" />
                                {t('advertiser.customer')}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {[...new Set(campaignsList.map(c => c.client))].map(client => {
                                const lastMsg = chatMessages.filter(m => m.client === client).slice(-1)[0]
                                const unread = chatMessages.filter(m => m.client === client && !m.read && m.from !== 'advertiser').length
                                return (
                                    <button
                                        key={client}
                                        onClick={() => setActiveChatClient(client)}
                                        className={`w-full text-left p-3 rounded-xl transition-colors ${
                                            activeChatClient === client
                                                ? 'bg-[var(--success)]/10 border border-[var(--success)]/20'
                                                : 'hover:bg-[var(--surface)] border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-[var(--text)] text-sm font-medium">{client}</p>
                                            {unread > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-[10px] flex items-center justify-center">
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[var(--text-muted)] text-xs truncate mt-1">
                                            {lastMsg ? lastMsg.text : t('advertiser.noMessages', { client })}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Active chat */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--success)] to-emerald-600 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[var(--text)] font-semibold text-sm">{activeChatClient}</h2>
                                    <p className="text-[var(--text-muted)] text-xs">{t('advertiser.chatSubtitle', 'Переговоры по рекламной кампании')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setChatMessages(prev => prev.map(m => m.client === activeChatClient ? { ...m, read: true } : m))}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                                {t('advertiser.markRead')}
                            </button>
                            {/* [P18] added: Neuro-Sales psychotype trigger */}
                            <button
                                onClick={() => { setNeuroOpen(true); setNeuroResult(null) }}
                                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:text-[var(--text)] transition-colors"
                            >
                                <Brain className="w-3.5 h-3.5" />
                                Анализ психотипа аудитории
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.filter(m => m.client === activeChatClient).length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-[var(--text-muted)]">
                                    <MessageSquare className="w-8 h-8" />
                                    <p className="text-sm">{t('advertiser.noMessages', { client: activeChatClient })}</p>
                                </div>
                            )}
                            {chatMessages.filter(m => m.client === activeChatClient).map(msg => (
                                <div key={msg.id} className={`flex ${msg.from === 'advertiser' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${msg.from === 'advertiser'
                                        ? 'bg-[var(--success)]/20 text-[var(--text)]'
                                        : msg.from === 'owner'
                                            ? 'bg-[var(--primary)]/20 text-[var(--text)] border border-[var(--primary)]/30'
                                            : 'bg-[var(--surface)] text-[var(--text)]'
                                        }`}>
                                        {msg.from === 'owner' && (
                                            <p className="text-[var(--primary)] text-[10px] font-medium mb-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                {t('advertiser.owner', 'Владелец')}
                                            </p>
                                        )}
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{msg.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border)] flex gap-2">
                            <button type="button" className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)] transition-colors">
                                <Paperclip className="w-4 h-4" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={t('advertiser.writeTo', { client: activeChatClient })}
                                className="flex-1 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30"
                            />
                            <button type="submit" className="p-2 rounded-lg bg-[var(--success)] text-white hover:bg-[var(--success)]/90 transition-colors">
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    <div className="glass p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                                <BarChartIcon className="w-5 h-5 text-[var(--success)]" />
                                {t('advertiser.reportsTitle')}
                            </h2>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {t('advertiser.reportExportTitle')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            {[
                                { label: t('advertiser.totalReach'), value: totalStats.totalImpressions.toLocaleString(), change: '+12%', positive: true },
                                { label: t('advertiser.clicks'), value: totalStats.totalClicks.toLocaleString(), change: '+8%', positive: true },
                                { label: t('advertiser.conversions'), value: totalStats.totalConversions.toLocaleString(), change: '+23%', positive: true },
                                { label: t('advertiser.cpc'), value: `$${totalStats.totalClicks ? (totalStats.totalSpent / totalStats.totalClicks).toFixed(2) : '0.00'}`, change: '-5%', positive: true },
                            ].map((stat, i) => (
                                <div key={i} className="glass p-3">
                                    <p className="text-[var(--text-muted)] text-xs">{stat.label}</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className="text-lg font-bold text-[var(--text)]">{stat.value}</p>
                                        <span className={`text-xs ${stat.positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="impressions" fill="var(--success)" name={t('advertiser.impressions')} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="clicks" fill="var(--accent)" name={t('advertiser.clicks')} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="conversions" fill="var(--primary)" name={t('advertiser.conversions')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TARIFFS TAB */}
            {activeTab === 'tariffs' && (
                <div className="space-y-4">
                    <div className="glass p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-[var(--success)]" />
                            {t('advertiser.adRates')}
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm mb-6">{t('advertiser.adRatesDesc')}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {tariffs.map((tariff, i) => (
                                <div key={i} className="luxury-card p-5 hover:border-[var(--primary)]/30 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--success)] to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
                                        <tariff.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-[var(--text)] font-semibold text-lg">{tariff.name}</h3>
                                    <p className="text-2xl font-bold text-[var(--success)] mt-1">${tariff.price}</p>
                                    <p className="text-[var(--text-muted)] text-sm mt-1">{tariff.desc}</p>
                                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                        <p className="text-[var(--text-muted)] text-xs">{t('advertiser.example')}</p>
                                        <p className="text-[var(--text)] text-sm font-medium mt-1">
                                            {tariff.name === 'CPM' && t('advertiser.cpmExample')}
                                            {tariff.name === 'CPC' && t('advertiser.cpcExample')}
                                            {tariff.name === 'CPA' && t('advertiser.cpaExample')}
                                            {tariff.name !== 'CPM' && tariff.name !== 'CPC' && tariff.name !== 'CPA' && t('advertiser.fixExample')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                                <span className="text-[var(--success)] text-sm font-medium">{t('advertiser.profitability')}</span>
                            </div>
                            <p className="text-[var(--text-muted)] text-sm">
                                {t('advertiser.profitabilityText', { margin: '35%' })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Campaign Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[var(--success)]" />
                                {t('advertiser.newCampaign')}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.campaignName')}</label>
                                <input
                                    type="text"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30"
                                    placeholder={t('advertiser.campaignNamePlaceholder')}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.client')}</label>
                                    <input
                                        type="text"
                                        value={newCampaign.client}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, client: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30"
                                        placeholder={t('advertiser.clientPlaceholder')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.budgetLabel')}</label>
                                    <input
                                        type="number"
                                        value={newCampaign.budget}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30"
                                        placeholder={t('advertiser.budgetPlaceholder')}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.startDate')}</label>
                                    <input
                                        type="date"
                                        value={newCampaign.startDate}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.endDate')}</label>
                                    <input
                                        type="date"
                                        value={newCampaign.endDate}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.format')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['banner', 'video', 'native'].map(fmt => (
                                        <button
                                            key={fmt}
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, format: fmt })}
                                            className={`px-3 py-2 rounded-xl text-sm border transition-all ${newCampaign.format === fmt
                                                ? 'border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)]'
                                                : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)]'
                                                }`}
                                        >
                                            {fmt === 'banner' && t('advertiser.formatBanner')}
                                            {fmt === 'video' && t('advertiser.formatVideo')}
                                            {fmt === 'native' && t('advertiser.formatNative')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.targetAudience')}</label>
                                <select
                                    value={newCampaign.target}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, target: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                                >
                                    <option value="" className="bg-[var(--bg-secondary)]">{t('advertiser.chooseAudience')}</option>
                                    <option value="18-25" className="bg-[var(--bg-secondary)]">{t('advertiser.age1825')}</option>
                                    <option value="25-35" className="bg-[var(--bg-secondary)]">{t('advertiser.age2535')}</option>
                                    <option value="35-50" className="bg-[var(--bg-secondary)]">{t('advertiser.age3550')}</option>
                                    <option value="50+" className="bg-[var(--bg-secondary)]">{t('advertiser.age50plus')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">{t('advertiser.description')}</label>
                                <textarea
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--success)]/30 h-20 resize-none"
                                    placeholder={t('advertiser.descriptionPlaceholder')}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors"
                                >
                                    {t('advertiser.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    {t('advertiser.createCampaign')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Campaign Analytics Modal */}
            {analyticsOpen && selectedCampaign && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                                    {getFormatIcon(selectedCampaign.format)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">{selectedCampaign.name}</h2>
                                    <p className="text-[var(--text-muted)] text-xs">{selectedCampaign.client} • {selectedCampaign.startDate} — {selectedCampaign.endDate}</p>
                                </div>
                            </div>
                            <button onClick={() => setAnalyticsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            {[
                                { label: t('advertiser.budget'), value: `$${selectedCampaign.budget.toLocaleString()}` },
                                { label: t('advertiser.spent'), value: `$${selectedCampaign.spent.toLocaleString()}` },
                                { label: t('advertiser.ctr'), value: `${selectedCampaign.ctr}%` },
                                { label: t('advertiser.avgRoi'), value: `${selectedCampaign.roi}%` },
                            ].map((s, i) => (
                                <div key={i} className="glass p-3">
                                    <p className="text-[var(--text-muted)] text-xs">{s.label}</p>
                                    <p className="text-[var(--text)] font-bold text-lg mt-1">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                                <span>{t('advertiser.budgetUsage')}</span>
                                <span>{Math.round((selectedCampaign.spent / selectedCampaign.budget) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[var(--success)]"
                                    style={{ width: `${Math.min(100, (selectedCampaign.spent / selectedCampaign.budget) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="glass p-4 mb-6">
                            <h3 className="text-sm font-semibold text-[var(--text)] mb-4">{t('advertiser.dailyDynamics')}</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '8px' }} />
                                    <Bar dataKey="impressions" fill="var(--success)" name={t('advertiser.impressions')} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="clicks" fill="var(--accent)" name={t('advertiser.clicks')} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="conversions" fill="var(--primary)" name={t('advertiser.conversions')} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { toggleCampaignStatus(selectedCampaign.id); setAnalyticsOpen(false) }}
                                className="flex-1 py-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors"
                            >
                                {selectedCampaign.status === 'active' ? t('advertiser.pause') : selectedCampaign.status === 'paused' ? t('advertiser.resume') : t('advertiser.completed')}
                            </button>
                            <button
                                onClick={() => setAnalyticsOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                {t('advertiser.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [P18] added: Neuro-Sales psychotype modal */}
            {neuroOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-[var(--primary)]" />
                            Анализ психотипа аудитории
                        </h2>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Продукт</label>
                                <input
                                    value={neuroProduct}
                                    onChange={(e) => setNeuroProduct(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Цель</label>
                                <input
                                    value={neuroGoal}
                                    onChange={(e) => setNeuroGoal(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm outline-none"
                                />
                            </div>
                            <button
                                onClick={handleAnalyzePsychotype}
                                disabled={neuroLoading}
                                className="w-full py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {neuroLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                {neuroLoading ? 'Анализ…' : 'Анализировать переписку'}
                            </button>
                        </div>

                        {neuroResult && (
                            <div className="space-y-3 border-t border-[var(--border)] pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Доминирующий психотип</span>
                                    <span className="text-sm font-semibold text-[var(--primary)] uppercase">{neuroResult.psychotype}</span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">{neuroResult.reasoning}</div>
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] mb-1">Уверенность: {neuroResult.confidence}%</div>
                                    <div className="h-2 w-full rounded-full bg-[var(--surface)] overflow-hidden">
                                        <div className="h-full bg-[var(--primary)]" style={{ width: `${neuroResult.confidence}%` }} />
                                    </div>
                                </div>
                                <div className="rounded-xl bg-[var(--surface)] p-3 space-y-2">
                                    <div className="text-xs text-[var(--text-muted)]">Рекомендуемый CTA</div>
                                    <div className="text-sm text-[var(--text)] font-medium">{neuroResult.recommendation?.cta}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{neuroResult.recommendation?.headline}</div>
                                    <div className="text-xs text-[var(--text)]">{neuroResult.recommendation?.body}</div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setNeuroOpen(false)}
                            className="w-full mt-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-muted)] text-sm hover:bg-[var(--primary-soft)] transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}

            {/* Report Export Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5 text-[var(--success)]" />
                            {t('advertiser.reportExportTitle')}
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm mb-4">{t('advertiser.reportExportDesc')}</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleExport('csv')}
                                className="w-full p-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors flex items-center gap-3"
                            >
                                <FileText className="w-4 h-4 text-[var(--success)]" />
                                {t('advertiser.csv')}
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full p-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors flex items-center gap-3"
                            >
                                <FileType className="w-4 h-4 text-[var(--accent)]" />
                                {t('advertiser.json')}
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="w-full p-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors flex items-center gap-3"
                            >
                                <Printer className="w-4 h-4 text-[var(--primary)]" />
                                {t('advertiser.printPdf')}
                            </button>
                            <div className="border-t border-[var(--border)] pt-2 mt-2">
                                <button
                                    onClick={handleSendEmail}
                                    className="w-full p-3 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-sm hover:bg-[var(--success)]/20 transition-colors flex items-center gap-3 border border-[var(--success)]/20"
                                >
                                    <Mail className="w-4 h-4" />
                                    {t('advertiser.sendReport')}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowReportModal(false)}
                            className="w-full mt-3 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-muted)] text-sm hover:bg-[var(--primary-soft)] transition-colors"
                        >
                            {t('advertiser.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdvertiserDashboardPage
