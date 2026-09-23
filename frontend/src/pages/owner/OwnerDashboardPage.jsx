import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOwnerData } from './hooks/useOwnerData'
import { TAB_LABELS } from './data/initialData'
import { ownerApi } from '../../services/api'

// Tabs
import { OverviewTab } from './components/tabs/OverviewTab'
const TeamTab = lazy(() => import('./components/tabs/TeamTab').then(m => ({ default: m.TeamTab })))
const CabinetsTab = lazy(() => import('./components/tabs/CabinetsTab').then(m => ({ default: m.CabinetsTab })))
const FinanceTab = lazy(() => import('./components/tabs/FinanceTab').then(m => ({ default: m.FinanceTab })))
const SubscriptionsTab = lazy(() => import('./components/tabs/SubscriptionsTab').then(m => ({ default: m.SubscriptionsTab })))
// [ADDONS-MARKETPLACE-RESTORE] owner-редактор аддонов (тот же компонент, что витрина)
const AddonMarketplace = lazy(() => import('../../components/subscriptions/AddonMarketplace.jsx'))
const AdvertisingTab = lazy(() => import('./components/tabs/AdvertisingTab').then(m => ({ default: m.AdvertisingTab })))
const PricingTab = lazy(() => import('./components/tabs/PricingTab').then(m => ({ default: m.PricingTab })))
const SecurityTab = lazy(() => import('./components/tabs/SecurityTab').then(m => ({ default: m.SecurityTab })))
const AgentsTab = lazy(() => import('./components/tabs/AgentsTab').then(m => ({ default: m.AgentsTab })))
const ChatTab = lazy(() => import('./components/tabs/ChatTab').then(m => ({ default: m.ChatTab })))

const LegalTab = lazy(() => import('./components/tabs/LegalTab').then(m => ({ default: m.LegalTab })))
const AuditTab = lazy(() => import('./components/tabs/AuditTab').then(m => ({ default: m.AuditTab })))
const ServersTab = lazy(() => import('./components/tabs/ServersTab').then(m => ({ default: m.ServersTab })))
const UpdatesTab = lazy(() => import('./components/tabs/UpdatesTab').then(m => ({ default: m.UpdatesTab })))
const PromoTab = lazy(() => import('./components/tabs/PromoTab').then(m => ({ default: m.PromoTab })))
const NewsTab = lazy(() => import('./components/tabs/NewsTab').then(m => ({ default: m.NewsTab })))
const ReferralsTab = lazy(() => import('./components/tabs/ReferralsTab').then(m => ({ default: m.ReferralsTab })))
const IntegrationsTab = lazy(() => import('./components/tabs/IntegrationsTab').then(m => ({ default: m.IntegrationsTab })))
const AIAnalyticsTab = lazy(() => import('./components/tabs/AIAnalyticsTab').then(m => ({ default: m.AIAnalyticsTab })))
const LogsTab = lazy(() => import('./components/tabs/LogsTab').then(m => ({ default: m.LogsTab })))
const OMEGACoreTab = lazy(() => import('./components/tabs/OMEGACoreTab').then(m => ({ default: m.OMEGACoreTab })))

const TasksTab = lazy(() => import('./components/tabs/TasksTab').then(m => ({ default: m.TasksTab })))
const ApiKeysTab = lazy(() => import('./components/tabs/ApiKeysTab'))
const ExternalApiKeysTab = lazy(() => import('./components/tabs/ExternalApiKeysTab'))
const NotificationsTab = lazy(() => import('./components/tabs/NotificationsTab').then(m => ({ default: m.NotificationsTab })))
const HelpTab = lazy(() => import('./components/tabs/HelpTab').then(m => ({ default: m.HelpTab })))
const FeedbackTab = lazy(() => import('./components/tabs/FeedbackTab').then(m => ({ default: m.FeedbackTab })))
const DevStudioTab = lazy(() => import('./components/tabs/DevStudioTab').then(m => ({ default: m.DevStudioTab })))
const PaymentProvidersTab = lazy(() => import('./components/tabs/PaymentProvidersTab.jsx').then(m => ({ default: m.PaymentProvidersTab })))
const SubscribersTab = lazy(() => import('./components/tabs/SubscribersTab.jsx').then(m => ({ default: m.SubscribersTab })))
const OmegaFinanceTab = lazy(() => import('./components/tabs/OmegaFinanceTab').then(m => ({ default: m.OmegaFinanceTab })))
const OmegaSkillsTab = lazy(() => import('./components/tabs/OmegaSkillsTab').then(m => ({ default: m.OmegaSkillsTab })))
const OmegaMemoryTab = lazy(() => import('./components/tabs/OmegaMemoryTab').then(m => ({ default: m.OmegaMemoryTab })))
const OmegaApprovalQueue = lazy(() => import('../../components/omega/OmegaApprovalQueue.jsx').then(m => ({ default: m.OmegaApprovalQueue })))
const NeuralGraphTab = lazy(() => import('./components/tabs/NeuralGraphTab.jsx'))
const OmegaDevStudioTab = lazy(() => import('./components/tabs/OmegaDevStudioTab.jsx'))
const OmegaSwarmDashboard = lazy(() => import('../../components/omega/OmegaSwarmDashboard.jsx'))
const OmegaAutoFixDashboard = lazy(() => import('../../components/omega/OmegaAutoFixDashboard.jsx'))
const OmegaLearningDashboard = lazy(() => import('../../components/omega/OmegaLearningDashboard.jsx'))
const OmegaResearchDashboard = lazy(() => import('../../components/omega/OmegaResearchDashboard.jsx'))
const MonitoringDashboard = lazy(() => import('../../components/admin/MonitoringDashboard.jsx'))
const OmegaResourceManager = lazy(() => import('../../components/omega/OmegaResourceManager.jsx'))
const OmegaRoadmap = lazy(() => import('../../components/omega/OmegaRoadmap.jsx'))
const OmegaMemoryExplorer = lazy(() => import('../../components/omega/OmegaMemoryExplorer.jsx'))
const OmegaBoardroom = lazy(() => import('../../components/omega/OmegaBoardroom.jsx'))
const OwnerRequisitesTab = lazy(() => import('./components/tabs/OwnerRequisitesTab').then(m => ({ default: m.OwnerRequisitesTab })))
const LegalSettingsTab = lazy(() => import('./components/tabs/LegalSettingsTab').then(m => ({ default: m.LegalSettingsTab })))
const ClientsTab = lazy(() => import('./components/tabs/ClientsTab').then(m => ({ default: m.ClientsTab })))
const MonetizationTab = lazy(() => import('./components/tabs/MonetizationTab').then(m => ({ default: m.MonetizationTab })))
const BrandVoiceTab = lazy(() => import('./components/tabs/BrandVoiceTab').then(m => ({ default: m.BrandVoiceTab })))
const PersonalityTab = lazy(() => import('./components/tabs/PersonalityTab'))
const DreamModeTab = lazy(() => import('./components/tabs/DreamModeTab'))
const TemplatesTab = lazy(() => import('./components/tabs/TemplatesTab').then(m => ({ default: m.TemplatesTab })))
const ScoutTab = lazy(() => import('./components/tabs/ScoutTab').then(m => ({ default: m.ScoutTab })))
const AutoImprovementTab = lazy(() => import('./components/tabs/AutoImprovementTab').then(m => ({ default: m.AutoImprovementTab })))
const ABTestingTab = lazy(() => import('./components/tabs/ABTestingTab').then(m => ({ default: m.ABTestingTab })))
const WhiteLabelTab = lazy(() => import('./components/tabs/WhiteLabelTab').then(m => ({ default: m.WhiteLabelTab })))
const WorkspacesTab = lazy(() => import('./components/tabs/WorkspacesTab').then(m => ({ default: m.WorkspacesTab })))
const DeveloperTab = lazy(() => import('./components/tabs/DeveloperTab').then(m => ({ default: m.DeveloperTab })))
const QRPrintTab = lazy(() => import('./components/tabs/QRPrintTab').then(m => ({ default: m.QRPrintTab })))
const FranchiseTab = lazy(() => import('./components/tabs/FranchiseTab').then(m => ({ default: m.FranchiseTab })))
const FleetTab = lazy(() => import('./components/tabs/FleetTab').then(m => ({ default: m.FleetTab })))
const SelfHealingCrisisTab = lazy(() => import('./components/tabs/SelfHealingCrisisTab').then(m => ({ default: m.SelfHealingCrisisTab })))
const SandboxPanel = lazy(() => import('./components/tabs/SandboxPanel').then(m => ({ default: m.SandboxPanel })))
const SelfOptimizeTab = lazy(() => import('./components/tabs/SelfOptimizeTab').then(m => ({ default: m.SelfOptimizeTab })))
const TelegramTab = lazy(() => import('./components/tabs/TelegramTab'))
const SupportTab = lazy(() => import('./components/tabs/SupportTab').then(m => ({ default: m.SupportTab })))
const TicketsTab = lazy(() => import('./components/tabs/TicketsTab.jsx'))
const ChannelManagerTab = lazy(() => import('./components/tabs/ChannelManagerTab').then(m => ({ default: m.ChannelManagerTab })))
const AdOrdersTab = lazy(() => import('./components/tabs/AdOrdersTab').then(m => ({ default: m.AdOrdersTab })))
const SalesMetricsTab = lazy(() => import('./components/tabs/SalesMetricsTab.jsx'))

const AnalyticsPage = lazy(() => import('../AnalyticsPage'))
const ProjectFactoryPage = lazy(() => import('../project-factory/ProjectFactoryPage.jsx'))
const PredictionDashboard = lazy(() => import('../prediction/PredictionDashboard.jsx'))
const InvestmentPanel = lazy(() => import('../investment/InvestmentPanel.jsx'))
const BoardroomCommandCenter = lazy(() => import('../boardroom/BoardroomCommandCenter.jsx'))
const SchedulerPage = lazy(() => import('../SchedulerPage'))
// [CHAT-UNIFY] owner-вкладки aiChat/contentAnalyzer/viralChat — редиректы на единый Creative Hub (см. renderTab)
const SupremeStatusPage = lazy(() => import('../omega-supreme/SupremeStatusPage.jsx'))

// Modals
import { AddStaffModal } from './components/modals/AddStaffModal'
import { EditStaffModal } from './components/modals/EditStaffModal'
import { CreateCampaignModal } from './components/modals/CreateCampaignModal'
import { CreatePromoModal } from './components/modals/CreatePromoModal'
import { CreateNewsModal } from './components/modals/CreateNewsModal'

// Floating widgets
const OmegaChatWidget = lazy(() => import('../../components/omega/OmegaChatWidget').then(m => ({ default: m.OmegaChatWidget })))
import { ResponsiveAdBanner } from '../../components/ads/ResponsiveAdBanner'

import {
    LayoutDashboard, Users, Monitor, DollarSign, Building2, ShieldCheck,
    CreditCard, Server, RefreshCw, Gift, Newspaper, Share2, Settings,
    Megaphone, Lock, Plug, Brain, FileText, Bot, MessageSquare,
    CheckSquare, KeyRound, Bell, HelpCircle, Heart, Rocket, Wallet,
    BrainCircuit, Database, Scale, BarChart, BarChart3, Search, Calendar, TrendingUp, Zap,
    X, Palette, LayoutTemplate, Flame, Tag, Folder, Code, Code2, QrCode, Store, Shield, Terminal, Network,
    Wrench, GraduationCap, Microscope, Activity, Cpu, Map, Fingerprint, Moon, Factory, FlaskConical,
    Telescope, Landmark, Send, MessageCircle, Radio
} from 'lucide-react'

const TAB_ICONS = {
    overview: LayoutDashboard,
    team: Users,
    cabinets: Monitor,
    finance: DollarSign,
    legal: Building2,
    audit: ShieldCheck,
    subscriptions: CreditCard,
    servers: Server,
    updates: RefreshCw,
    promo: Gift,
    news: Newspaper,
    referrals: Share2,
    advertising: Megaphone,
    security: Lock,
    integrations: Plug,
    aiAnalytics: Brain,
    logs: FileText,
    agents: Bot,
    chat: MessageSquare,
    omega: Brain,
    tasks: CheckSquare,
    apiKeys: KeyRound,
    externalKeys: KeyRound,
    supreme: BrainCircuit,
    personality: Fingerprint,
    dream: Moon,
    notifications: Bell,
    help: HelpCircle,
    feedback: Heart,
    devStudio: Rocket,
    devstudio: Code2,
    payments: CreditCard,
    subscribers: Users,
    clients: Users,
    monetization: DollarSign,
    omegaFinance: Wallet,
    omegaSkills: BrainCircuit,
    omegaMemory: Database,
    legalSettings: Scale,
    analytics: BarChart,
    aiChat: Bot,
    contentAnalyzer: Search,
    scheduler: Calendar,
    viralChat: TrendingUp,
    brandVoice: Palette,
    templates: LayoutTemplate,
    scout: Flame,
    whiteLabel: Tag,
    workspaces: Folder,
    developer: Code,
    qr: QrCode,
    franchise: Store,
    fleet: Rocket,
    selfHealing: Shield,
    selfOptimize: Brain,
    sandbox: Terminal,
    approvalQueue: Shield,
    neural: Network,
    swarm: Bot,
    autofix: Wrench,
    autoImprove: Wrench,
    learning: GraduationCap,
    research: Microscope,
    abTest: FlaskConical,
    monitoring: Activity,
    resources: Cpu,
    roadmap: Map,
    brainviz: Brain,
    memory: Database,
    boardroom: Building2,
    factory: Factory,
    prediction: Telescope,
    investment: Landmark,
    telegram: Send,
    support: MessageCircle,
    channelManager: Radio,
    adOrders: Megaphone,
    salesMetrics: TrendingUp,
}

// [v6.0] added: count-up hook with requestAnimationFrame
// [v6.6-PART2] added: IntersectionObserver pause when component not visible
function useCountUp(end, duration = 1500) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    useEffect(() => {
        let raf
        let start = null
        let elapsed = 0
        let observer
        const tick = (now) => {
            if (start === null) start = now - elapsed
            elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            setCount(end * progress)
            if (progress < 1) raf = requestAnimationFrame(tick)
        }
        const startAnim = () => {
            if (!raf) raf = requestAnimationFrame(tick)
        }
        const stopAnim = () => {
            if (raf) {
                cancelAnimationFrame(raf)
                raf = null
            }
        }
        if (ref.current && typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) startAnim()
                else stopAnim()
            }, { threshold: 0.1 })
            observer.observe(ref.current)
        } else {
            startAnim()
        }
        return () => {
            stopAnim()
            if (observer) observer.disconnect()
        }
    }, [end, duration])
    return { count, ref }
}

// [v6.0] added: sparkline canvas for metric cards
// [v6.0] added: luxury glass metric card with count-up (спарклайн-заглушка удалена: выдуманный график)
function MetricCard({ label, value, suffix = '', icon: Icon, delay = 0 }) {
    const { count, ref } = useCountUp(value, 1500)
    const display = Number.isInteger(value)
        ? Math.floor(count).toLocaleString('ru-RU')
        : count.toFixed(1)
    return (
        <div
            ref={ref}
            className="glass-card glow-border rounded-2xl p-6 animate-fade-in-up hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-gray-400 text-xs font-medium">{label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums mt-1">
                        {display}{suffix}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-400" />
                </div>
            </div>
            {/* [REAL-DATA] декоративный спарклайн (sin-волна без данных) удалён — график без данных не рисуется */}
        </div>
    )
}

// [v6.0] added: pill quick-action button with gradient border
function QuickAction({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 border border-white/10 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-white">{label}</span>
            </div>
        </button>
    )
}

// [v6.0] added: glass dashboard header (greeting + metrics + quick actions)
// [REAL-DATA] все 4 метрики — из /owner/overview (БД). Нет данных → честный 0, без фолбэков.
function DashboardHeader({ data }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
    const [ov, setOv] = useState(null)
    useEffect(() => {
        let mounted = true
        ownerApi.overview().then(res => { if (mounted) setOv(res?.data || null) }).catch(() => {})
        return () => { mounted = false }
    }, [])
    const metrics = [
        { label: 'MRR', value: ov?.mrr ?? 0, suffix: ' ₽', icon: DollarSign },
        { label: 'Пользователи', value: ov?.totalUsers ?? 0, icon: Users },
        { label: 'AI-вызовов за 30 дней', value: ov?.aiCallsMonth ?? 0, icon: Zap },
        { label: 'Платящих подписчиков', value: ov?.paying ?? 0, icon: Brain },
    ]
    return (
        <div className="space-y-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {greeting}, {user?.name || 'Owner'}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    <QuickAction icon={Rocket} label="OMEGA" onClick={() => navigate('/creative-hub')} />
                    <QuickAction icon={BarChart3} label="Analytics" onClick={() => navigate('/owner?tab=aiAnalytics')} />
                    <QuickAction icon={Settings} label="Settings" onClick={() => navigate('/settings')} />
                    <QuickAction icon={Users} label="Team" onClick={() => navigate('/owner?tab=team')} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <MetricCard key={m.label} {...m} delay={i * 100} />
                ))}
            </div>
        </div>
    )
}

export default function OwnerDashboardPage() {
    const ownerData = useOwnerData()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { activeTab, setActiveTab, modal, setModal, toasts, setToasts } = ownerData

    // Sync active tab with URL query
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab')
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl)
        }
    }, [searchParams, activeTab, setActiveTab])

    const tabs = Object.keys(TAB_LABELS)

    const renderTab = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab data={ownerData} />
            case 'team': return <TeamTab data={ownerData} />
            case 'cabinets': return <CabinetsTab data={ownerData} />
            case 'finance': return <FinanceTab data={ownerData} />
            case 'legal': return <LegalTab data={ownerData} />
            case 'audit': return <AuditTab data={ownerData} />
            case 'subscriptions': return <SubscriptionsTab data={ownerData} />
            case 'addonsManage': return <AddonMarketplace /> // [ADDONS-MARKETPLACE-RESTORE] owner-only
            case 'payments': return <PaymentProvidersTab />
            case 'subscribers': return <SubscribersTab />
            case 'servers': return <ServersTab data={ownerData} />
            case 'updates': return <UpdatesTab data={ownerData} />
            case 'promo': return <PromoTab data={ownerData} />
            case 'news': return <NewsTab data={ownerData} />
            case 'referrals': return <ReferralsTab data={ownerData} />
            case 'advertising': return <AdvertisingTab data={ownerData} />
            case 'pricing': return <PricingTab /> // [25-TARIFF-GATES]
            case 'security': return <SecurityTab data={ownerData} />
            case 'integrations': return <IntegrationsTab data={ownerData} />
            case 'aiAnalytics': return <AIAnalyticsTab data={ownerData} />
            case 'logs': return <LogsTab data={ownerData} />
            case 'agents': return <AgentsTab data={ownerData} />
            case 'chat': return <ChatTab data={ownerData} />
            case 'omega': return <OMEGACoreTab data={ownerData} />
            case 'neural': return <NeuralGraphTab />
            case 'tasks': return <TasksTab data={ownerData} />
            case 'apiKeys': return <ApiKeysTab data={ownerData} />
            case 'externalKeys': return <ExternalApiKeysTab data={ownerData} />
            case 'supreme': return <SupremeStatusPage />
            case 'notifications': return <NotificationsTab data={ownerData} />
            case 'help': return <HelpTab data={ownerData} />
            case 'feedback': return <FeedbackTab data={ownerData} />
            case 'devStudio': return <DevStudioTab data={ownerData} />
            case 'devstudio': return <OmegaDevStudioTab data={ownerData} />
            case 'swarm': return <OmegaSwarmDashboard />
            case 'autofix': return <OmegaAutoFixDashboard />
            case 'autoImprove': return <AutoImprovementTab data={ownerData} />
            case 'abTest': return <ABTestingTab data={ownerData} />
            case 'learning': return <OmegaLearningDashboard />
            case 'research': return <OmegaResearchDashboard />
            case 'monitoring': return <MonitoringDashboard />
            case 'resources': return <OmegaResourceManager />
            case 'roadmap': return <OmegaRoadmap />
            case 'brainviz': return <NeuralGraphTab />
            case 'memory': return <OmegaMemoryExplorer />
            case 'boardroom': return <BoardroomCommandCenter />
            case 'prediction': return <PredictionDashboard />
            case 'investment': return <InvestmentPanel />
            case 'telegram': return <TelegramTab data={ownerData} />
            case 'support': return <TicketsTab />
            case 'channelManager': return <ChannelManagerTab data={ownerData} />
            case 'adOrders': return <AdOrdersTab data={ownerData} />
            case 'salesMetrics': return <SalesMetricsTab />
            case 'omegaFinance': return <OmegaFinanceTab data={ownerData} />
            case 'omegaSkills': return <OmegaSkillsTab data={ownerData} />
            case 'omegaMemory': return <OmegaMemoryTab data={ownerData} />
            case 'personality': return <PersonalityTab data={ownerData} />
            case 'dream': return <DreamModeTab data={ownerData} />
            case 'requisites': return <OwnerRequisitesTab data={ownerData} />
            case 'legalSettings': return <LegalSettingsTab data={ownerData} />
            case 'clients': return <ClientsTab data={ownerData} />
            case 'monetization': return <MonetizationTab data={ownerData} />
            case 'brandVoice': return <BrandVoiceTab data={ownerData} />
            case 'templates': return <TemplatesTab data={ownerData} />
            case 'scout': return <ScoutTab data={ownerData} />
            case 'whiteLabel': return <WhiteLabelTab data={ownerData} />
            case 'workspaces': return <WorkspacesTab data={ownerData} />
            case 'developer': return <DeveloperTab data={ownerData} />
            case 'qr': return <QRPrintTab data={ownerData} />
            case 'franchise': return <FranchiseTab data={ownerData} />
            case 'fleet': return <FleetTab data={ownerData} />
            case 'selfHealing': return <SelfHealingCrisisTab data={ownerData} />
            case 'selfOptimize': return <SelfOptimizeTab data={ownerData} />
            case 'sandbox': return <SandboxPanel data={ownerData} />
            case 'approvalQueue': return <OmegaApprovalQueue />
            case 'factory': return <ProjectFactoryPage />
            case 'analytics': return <AnalyticsPage />
            // [CHAT-UNIFY] старые ссылки ?tab=aiChat|contentAnalyzer|viralChat → единый Creative Hub
            case 'aiChat': return <Navigate to="/creative-hub/chat" replace />
            case 'contentAnalyzer': return <Navigate to="/creative-hub/analyzer" replace />
            case 'contentAnalysis': return <Navigate to="/creative-hub/analyzer" replace />
            case 'viralChat': return <Navigate to="/creative-hub/viral" replace />
            case 'scheduler': return <SchedulerPage />
            default: return <OverviewTab data={ownerData} />
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Content */}
            <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
                {activeTab === 'overview' && <DashboardHeader data={ownerData} />}
                <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-[#00ff41] border-t-transparent rounded-full" /></div>}>{renderTab()}</Suspense>
            </div>

            {/* Modals */}
            <AddStaffModal
                isOpen={modal?.type === 'addStaff'}
                onClose={() => setModal(null)}
                onAdd={ownerData.addStaff}
            />
            <EditStaffModal
                isOpen={modal?.type === 'editStaff'}
                onClose={() => setModal(null)}
                staff={modal?.data}
                onUpdate={ownerData.updateStaff}
            />
            <CreateCampaignModal
                isOpen={modal?.type === 'createCampaign'}
                onClose={() => setModal(null)}
                onCreate={ownerData.addCampaign}
            />
            <CreatePromoModal
                isOpen={modal?.type === 'createPromo'}
                onClose={() => setModal(null)}
                onCreate={ownerData.addPromo}
            />
            <CreateNewsModal
                isOpen={modal?.type === 'createNews'}
                onClose={() => setModal(null)}
                onCreate={ownerData.addNews}
            />

            {/* Toasts */}
            <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-[110] space-y-2">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right ${
                        t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                        <span className="text-sm font-medium">{t.message}</span>
                        <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-white">
                            {/* [P23] fixed: toast close touch target */}
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Desktop bottom ad banner */}
            <div className="hidden sm:block px-4 lg:px-6 pb-4 lg:pb-6">
                <ResponsiveAdBanner variant="desktop-bottom" />
            </div>

            {/* Omega floating chat */}
            <OmegaChatWidget onOpenApiKeys={() => setActiveTab('externalKeys')} />
        </div>
    )
}
