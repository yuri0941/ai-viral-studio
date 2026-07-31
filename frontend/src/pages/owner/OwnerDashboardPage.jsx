import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { NotificationsTab } from './components/tabs/NotificationsTab'
import { HelpTab } from './components/tabs/HelpTab'
import { FeedbackTab } from './components/tabs/FeedbackTab'
import { DevStudioTab } from './components/tabs/DevStudioTab'
import { OmegaFinanceTab } from './components/tabs/OmegaFinanceTab'
import { OmegaSkillsTab } from './components/tabs/OmegaSkillsTab'
import { OmegaMemoryTab } from './components/tabs/OmegaMemoryTab'
import { OwnerRequisitesTab } from './components/tabs/OwnerRequisitesTab'

import { LegalSettingsTab } from './components/tabs/LegalSettingsTab'

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

import {
    LayoutDashboard, Users, Monitor, DollarSign, Building2, ShieldCheck,
    CreditCard, Server, RefreshCw, Gift, Newspaper, Share2,
    Megaphone, Lock, Plug, Brain, FileText, Bot, MessageSquare,
    CheckSquare, KeyRound, Bell, HelpCircle, Heart, Rocket, Wallet,
    BrainCircuit, Database, Scale,
    X
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
    notifications: Bell,
    help: HelpCircle,
    feedback: Heart,
    devStudio: Rocket,
    omegaFinance: Wallet,
    omegaSkills: BrainCircuit,
    omegaMemory: Database,
    legalSettings: Scale,
}

export default function OwnerDashboardPage() {
    const ownerData = useOwnerData()
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
            case 'tasks': return <TasksTab data={ownerData} />
            case 'apiKeys': return <ApiKeysTab data={ownerData} />
            case 'notifications': return <NotificationsTab data={ownerData} />
            case 'help': return <HelpTab data={ownerData} />
            case 'feedback': return <FeedbackTab data={ownerData} />
            case 'devStudio': return <DevStudioTab data={ownerData} />
            case 'omegaFinance': return <OmegaFinanceTab data={ownerData} />
            case 'omegaSkills': return <OmegaSkillsTab data={ownerData} />
            case 'omegaMemory': return <OmegaMemoryTab data={ownerData} />
            case 'requisites': return <OwnerRequisitesTab data={ownerData} />
            case 'legalSettings': return <LegalSettingsTab data={ownerData} />
            default: return <OverviewTab data={ownerData} />
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Content */}
            <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
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
                        <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-gray-500 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Omega floating chat */}
            <OmegaChatWidget onOpenApiKeys={() => setActiveTab('apiKeys')} />
        </div>
    )
}
