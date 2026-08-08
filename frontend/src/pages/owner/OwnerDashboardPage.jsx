import { useEffect, useState, useRef, lazy } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOwnerData } from './hooks/useOwnerData'
import { TAB_LABELS } from './data/initialData'

// Tabs
import { OverviewTab } from './components/tabs/OverviewTab'
import { TeamTab } from './components/tabs/TeamTab'
import { CabinetsTab } from './components/tabs/CabinetsTab'
import { FinanceTab } from './components/tabs/FinanceTab'
import { SubscriptionsTab } from './components/tabs/SubscriptionsTab'
import { AdvertisingTab } from './components/tabs/AdvertisingTab'
import { SecurityTab } from './components/tabs/SecurityTab'
import { AgentsTab } from './components/tabs/AgentsTab'
import { ChatTab } from './components/tabs/ChatTab'

import { LegalTab } from './components/tabs/LegalTab'
import { AuditTab } from './components/tabs/AuditTab'
import { ServersTab } from './components/tabs/ServersTab'
import { UpdatesTab } from './components/tabs/UpdatesTab'
import { PromoTab } from './components/tabs/PromoTab'
import { NewsTab } from './components/tabs/NewsTab'
import { ReferralsTab } from './components/tabs/ReferralsTab'
import { IntegrationsTab } from './components/tabs/IntegrationsTab'
import { AIAnalyticsTab } from './components/tabs/AIAnalyticsTab'
import { LogsTab } from './components/tabs/LogsTab'
import { OMEGACoreTab } from './components/tabs/OMEGACoreTab'

import { TasksTab } from './components/tabs/TasksTab'
import { ApiKeysTab } from './components/tabs/ApiKeysTab'
import ExternalApiKeysTab from './components/tabs/ExternalApiKeysTab'
import { NotificationsTab } from './components/tabs/NotificationsTab'
import { HelpTab } from './components/tabs/HelpTab'
import { FeedbackTab } from './components/tabs/FeedbackTab'
import { DevStudioTab } from './components/tabs/DevStudioTab'
import { PaymentProvidersTab } from './components/tabs/PaymentProvidersTab.jsx'
import { SubscribersTab } from './components/tabs/SubscribersTab.jsx'
import { OmegaFinanceTab } from './components/tabs/OmegaFinanceTab'
import { OmegaSkillsTab } from './components/tabs/OmegaSkillsTab'
import { OmegaMemoryTab } from './components/tabs/OmegaMemoryTab'
import { OmegaApprovalQueue } from '../../components/omega/OmegaApprovalQueue.jsx'
import OmegaBrainViz from '../../components/omega/OmegaBrainViz.jsx'
import OmegaDevStudio from '../../components/omega/OmegaDevStudio.jsx'
import OmegaSwarmDashboard from '../../components/omega/OmegaSwarmDashboard.jsx'
import OmegaAutoFixDashboard from '../../components/omega/OmegaAutoFixDashboard.jsx'
import OmegaLearningDashboard from '../../components/omega/OmegaLearningDashboard.jsx'
import OmegaResearchDashboard from '../../components/omega/OmegaResearchDashboard.jsx'
import MonitoringDashboard from '../../components/admin/MonitoringDashboard.jsx'
import OmegaResourceManager from '../../components/omega/OmegaResourceManager.jsx'
import OmegaRoadmap from '../../components/omega/OmegaRoadmap.jsx'
import OmegaMemoryExplorer from '../../components/omega/OmegaMemoryExplorer.jsx'
import OmegaBoardroom from '../../components/omega/OmegaBoardroom.jsx'
import { OwnerRequisitesTab } from './components/tabs/OwnerRequisitesTab'
import { LegalSettingsTab } from './components/tabs/LegalSettingsTab'
import { BrandVoiceTab } from './components/tabs/BrandVoiceTab'
import PersonalityTab from './components/tabs/PersonalityTab'
import DreamModeTab from './components/tabs/DreamModeTab'
import { TemplatesTab } from './components/tabs/TemplatesTab'
import { ScoutTab } from './components/tabs/ScoutTab'
import { AutoImprovementTab } from './components/tabs/AutoImprovementTab'
import { ABTestingTab } from './components/tabs/ABTestingTab'
import { WhiteLabelTab } from './components/tabs/WhiteLabelTab'
import { WorkspacesTab } from './components/tabs/WorkspacesTab'
import { DeveloperTab } from './components/tabs/DeveloperTab'
import { QRPrintTab } from './components/tabs/QRPrintTab'
import { FranchiseTab } from './components/tabs/FranchiseTab'
import { FleetTab } from './components/tabs/FleetTab'
import { SelfHealingCrisisTab } from './components/tabs/SelfHealingCrisisTab'
import { SandboxPanel } from './components/tabs/SandboxPanel'
import TelegramTab from './components/tabs/TelegramTab'

const AnalyticsPage = lazy(() => import('../AnalyticsPage'))
const ProjectFactoryPage = lazy(() => import('../project-factory/ProjectFactoryPage.jsx'))
const PredictionDashboard = lazy(() => import('../prediction/PredictionDashboard.jsx'))
const InvestmentPanel = lazy(() => import('../investment/InvestmentPanel.jsx'))
const BoardroomCommandCenter = lazy(() => import('../boardroom/BoardroomCommandCenter.jsx'))
const AIChatPage = lazy(() => import('../AIChatPage'))
const ContentAnalyzerPage = lazy(() => import('../ContentAnalyzerPage'))
const SchedulerPage = lazy(() => import('../SchedulerPage'))
const ViralChatPage = lazy(() => import('../ViralChatPage'))
const SupremeStatusPage = lazy(() => import('../omega-supreme/SupremeStatusPage.jsx'))

// Modals
import { AddStaffModal } from './components/modals/AddStaffModal'
import { EditStaffModal } from './components/modals/EditStaffModal'
import { CreateCampaignModal } from './components/modals/CreateCampaignModal'
import { CreatePromoModal } from './components/modals/CreatePromoModal'
import { CreateNewsModal } from './components/modals/CreateNewsModal'
import { AddTaskModal } from './components/modals/AddTaskModal'
import { AddAPIKeyModal } from './components/modals/AddAPIKeyModal'
import { CreateAgentModal } from './components/modals/CreateAgentModal'
import { SendEmailModal } from './components/modals/SendEmailModal'
import { OmegaApprovalModal } from './components/modals/OmegaApprovalModal'

// Floating widgets
import { OmegaChatWidget } from '../../components/omega/OmegaChatWidget'
import { ResponsiveAdBanner } from '../../components/ads/ResponsiveAdBanner'

import {
    LayoutDashboard, Users, Monitor, DollarSign, Building2, ShieldCheck,
    CreditCard, Server, RefreshCw, Gift, Newspaper, Share2, Settings,
    Megaphone, Lock, Plug, Brain, FileText, Bot, MessageSquare,
    CheckSquare, KeyRound, Bell, HelpCircle, Heart, Rocket, Wallet,
    BrainCircuit, Database, Scale, BarChart, BarChart3, Search, Calendar, TrendingUp, Zap,
    X, Palette, LayoutTemplate, Flame, Tag, Folder, Code, Code2, QrCode, Store, Shield, Terminal, Network,
    Wrench, GraduationCap, Microscope, Activity, Cpu, Map, Fingerprint, Moon, Factory, FlaskConical,
    Telescope, Landmark, Send
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
function Sparkline({ value, height = 40 }) {
    const canvasRef = useRef(null)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        const w = canvas.clientWidth
        canvas.width = w * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        const points = 12
        const data = Array.from({ length: points }, (_, i) => {
            const seed = Math.sin(value + i * 1.7) * 0.5 + 0.5
            return 0.2 + seed * 0.6
        })
        const step = w / (points - 1)
        ctx.clearRect(0, 0, w, height)
        ctx.beginPath()
        ctx.moveTo(0, height - data[0] * height)
        data.forEach((d, i) => ctx.lineTo(i * step, height - d * height))
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.lineTo(w, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        grad.addColorStop(0, 'rgba(139,92,246,0.25)')
        grad.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.fillStyle = grad
        ctx.fill()
    }, [value, height])
    return <canvas ref={canvasRef} className="w-full mt-3" style={{ height }} />
}

// [v6.0] added: luxury glass metric card with count-up and sparkline
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
            <Sparkline value={value} />
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
function DashboardHeader({ data }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
    const mrr = (data?.subscriptions || []).reduce((a, b) => a + (b.price || 0) * (b.users || 0), 0)
    const metrics = [
        { label: 'MRR', value: mrr || 39000, suffix: ' ₽', icon: DollarSign },
        { label: 'Пользователи', value: 1247, icon: Users },
        { label: 'AI-генераций', value: 8543, icon: Zap },
        { label: 'Uptime', value: 99.0, suffix: '%', icon: Brain },
    ]
    return (
        <div className="space-y-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {greeting}, {user?.name || 'Owner'}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    <QuickAction icon={Rocket} label="Creative Hub" onClick={() => navigate('/creative-hub')} />
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
            case 'payments': return <PaymentProvidersTab />
            case 'subscribers': return <SubscribersTab />
            case 'servers': return <ServersTab data={ownerData} />
            case 'updates': return <UpdatesTab data={ownerData} />
            case 'promo': return <PromoTab data={ownerData} />
            case 'news': return <NewsTab data={ownerData} />
            case 'referrals': return <ReferralsTab data={ownerData} />
            case 'advertising': return <AdvertisingTab data={ownerData} />
            case 'security': return <SecurityTab data={ownerData} />
            case 'integrations': return <IntegrationsTab data={ownerData} />
            case 'aiAnalytics': return <AIAnalyticsTab data={ownerData} />
            case 'logs': return <LogsTab data={ownerData} />
            case 'agents': return <AgentsTab data={ownerData} />
            case 'chat': return <ChatTab data={ownerData} />
            case 'omega': return <OMEGACoreTab data={ownerData} />
            case 'neural': return <OmegaBrainViz data={ownerData} />
            case 'tasks': return <TasksTab data={ownerData} />
            case 'apiKeys': return <ApiKeysTab data={ownerData} />
            case 'externalKeys': return <ExternalApiKeysTab data={ownerData} />
            case 'supreme': return <SupremeStatusPage />
            case 'notifications': return <NotificationsTab data={ownerData} />
            case 'help': return <HelpTab data={ownerData} />
            case 'feedback': return <FeedbackTab data={ownerData} />
            case 'devStudio': return <DevStudioTab data={ownerData} />
            case 'devstudio': return <OmegaDevStudio />
            case 'swarm': return <OmegaSwarmDashboard />
            case 'autofix': return <OmegaAutoFixDashboard />
            case 'autoImprove': return <AutoImprovementTab data={ownerData} />
            case 'abTest': return <ABTestingTab data={ownerData} />
            case 'learning': return <OmegaLearningDashboard />
            case 'research': return <OmegaResearchDashboard />
            case 'monitoring': return <MonitoringDashboard />
            case 'resources': return <OmegaResourceManager />
            case 'roadmap': return <OmegaRoadmap />
            case 'brainviz': return <OmegaBrainViz />
            case 'memory': return <OmegaMemoryExplorer />
            case 'boardroom': return <BoardroomCommandCenter />
            case 'prediction': return <PredictionDashboard />
            case 'investment': return <InvestmentPanel />
            case 'telegram': return <TelegramTab data={ownerData} />
            case 'omegaFinance': return <OmegaFinanceTab data={ownerData} />
            case 'omegaSkills': return <OmegaSkillsTab data={ownerData} />
            case 'omegaMemory': return <OmegaMemoryTab data={ownerData} />
            case 'personality': return <PersonalityTab data={ownerData} />
            case 'dream': return <DreamModeTab data={ownerData} />
            case 'requisites': return <OwnerRequisitesTab data={ownerData} />
            case 'legalSettings': return <LegalSettingsTab data={ownerData} />
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
            case 'sandbox': return <SandboxPanel data={ownerData} />
            case 'approvalQueue': return <OmegaApprovalQueue />
            case 'factory': return <ProjectFactoryPage />
            case 'analytics': return <AnalyticsPage />
            case 'aiChat': return <AIChatPage />
            case 'contentAnalyzer': return <ContentAnalyzerPage />
            case 'scheduler': return <SchedulerPage />
            case 'viralChat': return <ViralChatPage />
            default: return <OverviewTab data={ownerData} />
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Content */}
            <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
                {activeTab === 'overview' && <DashboardHeader data={ownerData} />}
                {renderTab()}
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

            <AddTaskModal
                isOpen={modal?.type === 'addTask'}
                onClose={() => setModal(null)}
                onAdd={ownerData.addTask}
                staffList={ownerData.staff}
            />
            <AddAPIKeyModal
                isOpen={modal?.type === 'addApiKey'}
                onClose={() => setModal(null)}
                onAdd={ownerData.addApiKey}
            />
            <CreateAgentModal
                isOpen={modal?.type === 'createAgent'}
                onClose={() => setModal(null)}
                onCreate={ownerData.addAgent}
            />
            <SendEmailModal
                isOpen={modal?.type === 'sendEmail'}
                onClose={() => setModal(null)}
                onSend={ownerData.sendEmail}
                recipients={ownerData.staff}
            />
            <OmegaApprovalModal
                isOpen={modal?.type === 'omegaApproval'}
                onClose={() => setModal(null)}
                request={modal?.data}
                onApprove={(req) => ownerData.approveRequest(req.id, req.comment)}
                onReject={(req) => ownerData.rejectRequest(req.id, req.comment)}
            />

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-[110] space-y-2">
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
