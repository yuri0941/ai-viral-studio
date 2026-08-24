import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { youtubeApi, paymentsApi } from '../services/api.js'; // [19.13-lite-PAYMENTS-NPD] payments history API
import i18n from '../i18n';
// [PLANCONFIG-ADMIN] legacy config/plans.js удалён; фолбэки = дефолты PlanConfig (free 20 ген/день, 0/990/4990₽)
const DEFAULT_FREE_GENERATIONS = 20;
const DEFAULT_PLAN_PRICES = { free: 0, pro: 990, agency: 4990 };
const fallbackPlanPrice = (plan) => plan?.price ?? DEFAULT_PLAN_PRICES[plan?.id] ?? 0;
import IntegrationsTab from './settings/IntegrationsTab.jsx'; // [SOCIAL-v5.1] added
import AddonMarketplace from '../components/subscriptions/AddonMarketplace.jsx'; // [v7.0-PART2] addon marketplace
import TelegramConnectButton from '../components/social/TelegramConnectButton.jsx'; // [v9.9.19-MASTER-AUDIT] клиентский Telegram Connect
import { CLIENT_BOT_USERNAME, clientBotUrl } from '../config/bots.js';
import {
    User, Diamond, Link2, Bell, Shield, Palette, LogOut,
    Camera, Save, Check, Youtube, Music, Instagram, Twitter,
    Send, Globe, Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff,
    ChevronRight, Sparkles, Crown, Zap, Users, Calendar, CreditCard,
    Wallet, Bitcoin, Volume2, VolumeX, Linkedin, Loader2, Monitor,
    Stamp, Receipt
} from 'lucide-react';

const PLAN_COLORS = {
    free: 'from-gray-600 to-gray-700',
    starter: 'from-blue-500 to-blue-600',
    creator: 'from-indigo-500 to-indigo-600',
    pro: 'from-emerald-500 to-teal-600',
    agency: 'from-[#00ff41] to-[#00cc33]',
    enterprise: 'from-purple-500 to-pink-600',
}; // [P24] fixed: plan color mapping

const CURRENCIES = [
    { value: 'RUB', label: '₽ RUB' },
    { value: 'USD', label: '$ USD' },
    { value: 'EUR', label: '€ EUR' },
    { value: 'UAH', label: '₴ UAH' },
    { value: 'KZT', label: '₸ KZT' },
]; // [P24] fixed: currency selector options

// [v9.9.19.17.4] YouTube connect tab for owner/admin/creator
function YouTubeSettingsTab() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState({ connected: false });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const data = await youtubeApi.status();
            setStatus(data || { connected: false });
        } catch (e) {
            setStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
        // [HOTFIX-YT-VERIFY-REACT31] reload status after OAuth callback redirects back to ?tab=youtube&youtube=success
    }, [searchParams]);

    const handleConnect = async () => {
        setActionLoading(true);
        try {
            const data = await youtubeApi.connectUrl('/settings?tab=youtube');
            if (data?.url) {
                window.open(data.url, '_blank');
            } else {
                toast.error(data?.error || t('youtube.connectFailed') || 'Не удалось получить URL авторизации YouTube');
            }
        } catch (e) {
            toast.error(t('youtube.connectFailed') || 'Не удалось получить URL авторизации YouTube');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm(t('youtube.disconnectConfirm') || 'Отключить YouTube? Токены будут отозваны и удалены.')) return;
        setActionLoading(true);
        try {
            await youtubeApi.disconnect();
            setStatus({ connected: false });
            toast.success(t('youtube.disconnected') || 'YouTube отключён');
        } catch (e) {
            toast.error(t('youtube.disconnectFailed') || 'Не удалось отключить YouTube');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                    <Youtube className="w-6 h-6 text-red-500" />
                    {t('youtube.title') || 'YouTube'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">{t('youtube.subtitle') || 'Подключите канал для загрузки видео из кабинета'}</p>
            </div>

            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-sm">YT</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {status.connected ? t('youtube.connected') || 'Подключено' : t('youtube.notConnected') || 'Не подключено'}
                    </span>
                </div>

                {status.connected && (
                    <div className="mb-4 space-y-1 text-sm text-gray-300">
                        <p>{t('youtube.channel', { title: status.channelTitle || status.channelId || '' })}</p>
                        <p className="text-xs text-gray-400">
                            {(() => {
                                if (!status.connectedAt) return '';
                                const d = new Date(status.connectedAt);
                                return !isNaN(d.getTime()) ? `${t('youtube.connectedAtLabel') || 'Подключено'}: ${d.toLocaleString('ru-RU')}` : '';
                            })()}
                        </p>
                    </div>
                )}

                {status.connected ? (
                    <button
                        onClick={handleDisconnect}
                        disabled={actionLoading}
                        className="w-full py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-50"
                    >
                        {actionLoading ? t('common.loading') : t('youtube.disconnect') || 'Отключить YouTube'}
                    </button>
                ) : (
                    <button
                        onClick={handleConnect}
                        disabled={actionLoading || loading}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50"
                    >
                        {actionLoading ? t('common.loading') : t('youtube.connect') || 'Подключить YouTube'}
                    </button>
                )}
            </div>
        </div>
    );
}

function SettingsPage() {
    const { t } = useTranslation();
    const { user, logout, updateUser, updatePreferences } = useAuth();
    // [CHECKOUT-UNIFY] поддержка ?tab= (billing → subscription): ссылки на оплату/тарифы ведут в нужный раздел
    const [activeTab, setActiveTab] = useState(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        const alias = { billing: 'subscription' };
        const known = ['profile', 'subscription', 'payments', 'integrations', 'youtube', 'notifications', 'security', 'appearance', 'watermark', 'scheduler', 'addons'];
        const mapped = alias[tab] || tab;
        return known.includes(mapped) ? mapped : 'profile';
    });
    const [saved, setSaved] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [showEmailPassword, setShowEmailPassword] = useState(false);
    const [twoFA, setTwoFA] = useState(false);
    const [isYearly, setIsYearly] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState({}); // [P24] fixed: per-method loading state
    const [userSubscription, setUserSubscription] = useState(() => {
        const saved = localStorage.getItem('user_subscription');
        return saved ? JSON.parse(saved) : null;
    });
    // [MONETIZE-2026-08-04] added: quota state for subscription card
    const [quota, setQuota] = useState({ used: 0, limit: DEFAULT_FREE_GENERATIONS });
    const [quotaLoading, setQuotaLoading] = useState(false);
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        marketing: false,
        weekly: true
    });
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('omega_sound_enabled');
        return saved ? JSON.parse(saved) : true;
    });
    const [animationsEnabled, setAnimationsEnabled] = useState(() => {
        const saved = localStorage.getItem('omega_animations_enabled');
        return saved ? JSON.parse(saved) : true;
    });
    const [profile, setProfile] = useState({
        name: user?.name || 'Owner',
        email: user?.email || 'owner@ai-viral.com',
        bio: '',
        niche: '',
        language: user?.preferences?.language || 'ru',
        timezone: user?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'
    });
    // [v9.9.19.17.7] added: auto-clean TTL for published scheduler posts
    const [autoCleanTTL, setAutoCleanTTL] = useState(user?.preferences?.autoCleanTTL ?? 15);
    const [autoCleanSaving, setAutoCleanSaving] = useState(false);

    // [P20] added: watermark settings state
    const [watermark, setWatermark] = useState({
        enabled: true,
        position: 'bottom-right',
        opacity: 0.3,
        size: 0.15,
    });
    const [watermarkLoading, setWatermarkLoading] = useState(false);
    const [watermarkPreview, setWatermarkPreview] = useState('');
    const [watermarkSaved, setWatermarkSaved] = useState(false);
    const [watermarkEligibility, setWatermarkEligibility] = useState({ canDisable: false });

    // [P24] fixed: avatar upload state
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [avatarLoading, setAvatarLoading] = useState(false);
    const avatarInputRef = useRef(null);

    // [19.13-lite-PAYMENTS-NPD] payments history tab state
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsError, setPaymentsError] = useState(null);
    const [paymentsLoaded, setPaymentsLoaded] = useState(false);
    const [resendingReceiptId, setResendingReceiptId] = useState(null);
    const [resentReceiptIds, setResentReceiptIds] = useState({});

    useEffect(() => {
        if (user?.preferences?.timezone && user.preferences.timezone !== profile.timezone) {
            setProfile(p => ({ ...p, timezone: user.preferences.timezone }))
        }
        if (typeof user?.preferences?.autoCleanTTL === 'number' && user.preferences.autoCleanTTL !== autoCleanTTL) {
            setAutoCleanTTL(user.preferences.autoCleanTTL)
        }
    }, [user?.preferences?.timezone, user?.preferences?.autoCleanTTL])

    // [FIX-2026-08-05] removed old socials loader (tab deleted)

    // [P20] added: load watermark settings and eligibility
    useEffect(() => {
        if (user?.watermarkSettings) {
            setWatermark(prev => ({ ...prev, ...user.watermarkSettings }))
        }
        const token = localStorage.getItem('token')
        if (token) {
            fetch(`${API_BASE_URL}/users/me/watermark-eligibility`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(r => r.json())
                .then(d => setWatermarkEligibility(d || { canDisable: false }))
                .catch(() => setWatermarkEligibility({ canDisable: false }))
        }
    }, [user?.watermarkSettings])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        if (paymentStatus === 'success') {
            showToast(t('settings.paymentSuccess'), 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancel') {
            showToast(t('settings.paymentCancelled'), 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // [v9.9.19.17.4] handle YouTube OAuth redirect back to settings
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        const youtubeStatus = urlParams.get('youtube');
        if (tab) setActiveTab(tab);
        if (youtubeStatus === 'success') {
            toast.success(t('youtube.connectedSuccess') || '✅ YouTube подключён');
        } else if (youtubeStatus === 'error') {
            toast.error(t('youtube.connectError') || '❌ Ошибка подключения YouTube');
        }
        if (tab || youtubeStatus) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // [MONETIZE-2026-08-04] added: load current quota
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setQuotaLoading(true);
        fetch(`${API_BASE_URL}/users/me/quota`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const q = d?.data || d || {};
                setQuota({ used: q.generationsUsed || 0, limit: q.generationsLimit || DEFAULT_FREE_GENERATIONS });
            })
            .catch(() => setQuota({ used: 0, limit: DEFAULT_FREE_GENERATIONS }))
            .finally(() => setQuotaLoading(false));
    }, []);

    // [FIX-2026-08-05] removed old Telegram settings loader (moved to IntegrationsTab)

    // [19.13-lite-PAYMENTS-NPD] load payments history when the tab is opened
    useEffect(() => {
        if (activeTab !== 'payments' || paymentsLoaded) return;
        let cancelled = false;
        setPaymentsLoading(true);
        setPaymentsError(null);
        paymentsApi.history()
            .then(data => {
                if (cancelled) return;
                setPayments(Array.isArray(data?.payments) ? data.payments : []);
                setPaymentsLoaded(true);
            })
            .catch(err => {
                if (cancelled) return;
                setPaymentsError(err?.message || 'error');
            })
            .finally(() => {
                if (!cancelled) setPaymentsLoading(false);
            });
        return () => { cancelled = true; };
    }, [activeTab, paymentsLoaded]);

    // [19.13-lite-PAYMENTS-NPD] resend fiscal receipt to email
    const handleResendReceipt = async (paymentId) => {
        setResendingReceiptId(paymentId);
        try {
            await paymentsApi.resendReceipt(paymentId);
            setResentReceiptIds(prev => ({ ...prev, [paymentId]: true }));
            showToast(t('payments.receiptSent'), 'success');
        } catch (err) {
            showToast(t('payments.resendError'), 'error');
        } finally {
            setResendingReceiptId(null);
        }
    };

    // [CHECKOUT-UNIFY] тарифы RUB-only (PlanConfig): валюта отображения/оплаты зафиксирована в RUB,
    // селектор валюты скрыт (ниже), legacy USD-цен больше нет
    const [subscriptionCurrency, setSubscriptionCurrency] = useState('RUB');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() => {
        try { return localStorage.getItem('selected_payment_method') || 'yookassa'; } catch { return 'yookassa'; }
    });
    const [paymentError, setPaymentError] = useState(null);
    // [CHECKOUT-UNIFY] тарифы ТОЛЬКО из PlanConfig (GET /api/plan-config) — как на лендинге.
    // Legacy /api/plans (Creator 2900₽/Pro 7900₽/Agency 19900₽) больше не используется.
    // PlanConfig — RUB-only: отображение и оплата приведены к RUB (живой провайдер — ЮKassa),
    // USD-цены legacy-конфига ($29/$79/$199) не существуют в PlanConfig.
    const [plans, setPlans] = useState([]);
    const [foundingActive, setFoundingActive] = useState(false);
    const [foundingDiscountPercent, setFoundingDiscountPercent] = useState(30);

    useEffect(() => {
        fetch(`${API_BASE_URL}/plan-config`)
            .then(r => r.json())
            .then(data => {
                const loaded = (data.plans || []).map(p => ({
                    id: p.plan,
                    name: p.plan,
                    price: p.price,
                    quotas: p.quotas || {},
                    featureFlags: p.features || {},
                    featureList: p.featureList || { ru: [], en: [] },
                    color: PLAN_COLORS[p.plan] || 'from-gray-600 to-gray-700',
                    popular: p.plan === 'pro',
                }));
                setPlans(loaded);
            })
            .catch(err => {
                console.warn('[SettingsPage] failed to load plan-config:', err.message);
                setPlans([]);
            });
        fetch(`${API_BASE_URL}/launch/beta/slots`)
            .then(r => r.json())
            .then(res => {
                setFoundingActive(!!res?.data?.foundingActive);
                // [PLANCONFIG-ADMIN] процент скидки — из FoundingConfig (БД), фолбэк 30
                if (Number.isFinite(res?.data?.discountPercent)) setFoundingDiscountPercent(res.data.discountPercent);
            })
            .catch(() => {});
    }, []);

    // [CHECKOUT-UNIFY] строки фич из quotas/features PlanConfig (те же ключи, что на лендинге)
    // [PLANCONFIG-ADMIN] если владелец задал featureList RU/EN — рендерим его (приоритет над дефолтом)
    const planFeatureLines = (plan) => {
        const lang = (i18n.language || 'ru').slice(0, 2);
        const custom = plan.featureList?.[lang] || [];
        if (custom.length) return custom;
        const q = plan.quotas || {};
        // [CLIENT-JOURNEY-QA] поле PlanConfig — features; featureFlags не существует → список фич тарифа был пуст
        const f = plan.features || plan.featureFlags || {};
        const lines = [];
        if (q.generationsPerDay) lines.push(t('landing.plans.genPerDay', { count: q.generationsPerDay }));
        if (q.youtubeUploadsPerDay) lines.push(t('landing.plans.ytPerDay', { count: q.youtubeUploadsPerDay }));
        if (q.youtubeChannels) lines.push(t('landing.plans.ytChannels', { count: q.youtubeChannels }));
        if (q.mediaQueueMB) lines.push(t('landing.plans.mediaMB', { count: q.mediaQueueMB }));
        if (q.scheduledPostsMax) lines.push(t('landing.plans.scheduledMax', { count: q.scheduledPostsMax }));
        if (q.aiTagsPerDay) lines.push(t('landing.plans.aiTagsPerDay', { count: q.aiTagsPerDay }));
        for (const key of ['publishAt', 'playlists', 'brandVoice', 'abTesting', 'analytics', 'whiteLabel']) {
            if (f[key]) lines.push(t(`landing.plans.feature.${key}`));
        }
        return lines;
    };

    // [CHECKOUT-UNIFY] годовая цена = заряд бэкенда (price*12*0.8, yookassaController), а не ×10
    const getYearlyPrice = (monthlyPrice) => Math.round(monthlyPrice * 12 * 0.8);

    // [MASTER-v5.6] fixed: use API-loaded price, not static config
    const getCurrentPrice = (plan) => {
        const basePrice = fallbackPlanPrice(plan);
        if (userSubscription && userSubscription.planId === plan.id && userSubscription.isActive) {
            const now = new Date();
            const nextBilling = new Date(userSubscription.nextBillingDate);
            if (now < nextBilling) {
                return isYearly ? getYearlyPrice(userSubscription.lockedPrice) : userSubscription.lockedPrice;
            }
        }
        return isYearly ? getYearlyPrice(basePrice) : basePrice;
    };

    const pickDefaultMethod = (methods, currency, prev) => {
        const currencyMap = {
            RUB: ['yookassa'],
            USD: ['stripe', 'paypal'],
            EUR: ['stripe', 'paypal'],
            UAH: ['stripe', 'paypal'],
            KZT: ['stripe', 'paypal'],
        };
        const allowed = currencyMap[currency] || ['stripe', 'paypal'];
        const enabled = methods.filter(m => m.enabled && allowed.includes(m.id));
        if (!enabled.length) return null;
        if (prev && enabled.find(m => m.id === prev)) return prev;
        return enabled[0].id;
    };

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await fetch(`${API_BASE_URL}/subscriptions/config`);
                const json = await res.json();
                if (json.success) {
                    const methods = json.paymentMethods || [];
                    // [PLANCONFIG-ADMIN] ЮKassa теперь приходит с бэкенда (/subscriptions/config) — костыль убран;
                    // оставляем только рекомендацию RUB-only
                    methods.forEach(m => { m.recommended = m.id === 'yookassa'; })
                    setPaymentMethods(methods);
                    const defaultMethod = pickDefaultMethod(methods, subscriptionCurrency, selectedPaymentMethod);
                    if (defaultMethod && defaultMethod !== selectedPaymentMethod) {
                        setSelectedPaymentMethod(defaultMethod);
                        try { localStorage.setItem('selected_payment_method', defaultMethod); } catch {}
                    }
                    // [CHECKOUT-UNIFY] geo-валюта больше не переключает тарифы: PlanConfig — RUB-only
                }
            } catch (err) {
                console.error('[SettingsPage:loadConfig]', err);
            }
        }
        loadConfig();
    }, []); // [v9.9.19.14.5] load methods with enabled/reason and pick default by currency

    const setLoading = (planId, loading) => {
        setPaymentLoading(prev => ({ ...prev, [planId]: loading }));
    };

    const getPayButtonLabel = (method) => {
        const key = `settings.payWith_${method}`;
        const direct = t(key);
        if (direct && direct !== key) return direct;
        return t('settings.pay');
    };

    const handlePayment = (plan) => {
        if ((plan.priceRUB === 0 && plan.priceUSD === 0) || plan.price === 0) {
            handleSubscribe(plan);
            return;
        }
        processPayment(plan);
    };

    const getAllowedMethods = (currency) => {
        const map = {
            RUB: ['yookassa'],
            USD: ['stripe', 'paypal'],
            EUR: ['stripe', 'paypal'],
            UAH: ['stripe', 'paypal'],
            KZT: ['stripe', 'paypal'],
        };
        return map[currency] || ['stripe', 'paypal'];
    };

    const processPayment = async (plan) => {
        const allowed = getAllowedMethods(subscriptionCurrency);
        const methodObj = paymentMethods.find(m => m.id === selectedPaymentMethod && m.enabled && allowed.includes(m.id));
        if (!methodObj) {
            const msg = t('settings.paymentMethodUnavailable') || 'Выберите настроенный способ оплаты';
            setPaymentError(msg);
            showToast(msg, 'error');
            return;
        }
        const method = methodObj.id;
        const loadingKey = `${plan.id}-${method}`;
        setPaymentError(null);
        setPaymentLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            const token = localStorage.getItem('token') || '';
            const isYearlyPlan = isYearly;
            const interval = isYearlyPlan ? 'year' : 'month';
            let url = null;

            if (method === 'yookassa') {
                const res = await fetch(`${API_BASE_URL}/yookassa/pay/subscription`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ plan: plan.id, interval, currency: subscriptionCurrency })
                });
                const data = await res.json().catch(() => ({ error: 'Invalid response' }));
                if (!res.ok) throw new Error(data.error || data.message || data.reason || 'YooKassa payment failed');
                url = data.paymentUrl || data.url || data.confirmationUrl;
            } else if (method === 'stripe') {
                const res = await fetch(`${API_BASE_URL}/stripe/pay/subscription`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ provider: 'stripe', priceId: plan.id, userId: user?._id || '', plan: plan.id, email: user?.email || '', price: getCurrentPrice(plan), currency: subscriptionCurrency })
                });
                const data = await res.json().catch(() => ({ error: 'Invalid response' }));
                if (!res.ok) throw new Error(data.error || data.message || data.reason || 'Stripe payment failed');
                url = data.url;
            } else if (method === 'paypal') {
                const res = await fetch(`${API_BASE_URL}/paypal/create-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ planId: plan.id, interval, currency: subscriptionCurrency })
                });
                const data = await res.json().catch(() => ({ error: 'Invalid response' }));
                if (!res.ok) throw new Error(data.error || data.message || data.reason || 'PayPal payment failed');
                url = data.url || data.approvalUrl;
            } else if (method === 'crypto') {
                const res = await fetch(`${API_BASE_URL}/payments/crypto-charge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: `Подписка ${plan.name}`, description: `Подписка ${plan.name} (${interval})`, price: getCurrentPrice(plan), currency: subscriptionCurrency })
                });
                const data = await res.json().catch(() => ({ error: 'Invalid response' }));
                if (!res.ok) throw new Error(data.error || data.message || data.reason || 'Crypto payment failed');
                url = data.hosted_url;
            } else {
                throw new Error(t('settings.paymentMethodNotReady') || 'Метод оплаты в процессе настройки');
            }

            if (url) {
                window.location.href = url;
            } else {
                throw new Error(t('settings.paymentNoUrl') || 'Не получен URL оплаты');
            }
        } catch (err) {
            console.error('[SettingsPage:processPayment]', err);
            const msg = err.message || t('settings.paymentError') || 'Ошибка создания платежа';
            setPaymentError(msg);
            showToast(msg, 'error');
        } finally {
            setPaymentLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    const showToast = (message, type = 'info') => {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.warn('[SettingsPage] Toast not available:', message);
        }
    };

    const handleSubscribe = (plan) => {
        if (fallbackPlanPrice(plan) > 0) {
            handlePayment(plan);
            return;
        }
        const now = new Date();
        const nextBilling = new Date(now);
        nextBilling.setFullYear(nextBilling.getFullYear() + 100);
        const subscription = {
            planId: plan.id,
            planName: plan.name,
            price: 0,
            lockedPrice: 0,
            billingCycle: 'free',
            startDate: now.toISOString(),
            nextBillingDate: nextBilling.toISOString(),
            isActive: true,
            autoRenew: false
        };
        localStorage.setItem('user_subscription', JSON.stringify(subscription));
        setUserSubscription(subscription);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleCancelSubscription = () => {
        if (userSubscription) {
            const updated = { ...userSubscription, isActive: false, autoRenew: false };
            localStorage.setItem('user_subscription', JSON.stringify(updated));
            setUserSubscription(updated);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const isSubscribedTo = (planId) => {
        return userSubscription && userSubscription.planId === planId && userSubscription.isActive;
    };

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'subscription', label: t('settings.subscription'), icon: Diamond },
        { id: 'payments', label: t('settings.tabs.payments'), icon: Receipt }, // [19.13-lite-PAYMENTS-NPD] payments history tab
        { id: 'integrations', label: t('settings.integrations'), icon: Link2 }, // [FIX-2026-08-05] only one socials tab
        { id: 'youtube', label: t('settings.youtube') || 'YouTube', icon: Youtube },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette },
        { id: 'watermark', label: t('settings.watermark'), icon: Stamp },
        { id: 'scheduler', label: t('settings.schedulerTab'), icon: Calendar }, // [v9.9.19.17.7] scheduler settings
        { id: 'addons', label: t('settings.myAddons'), icon: Sparkles },
    ];

    const handleSave = async () => {
        if (updateUser) updateUser({ name: profile.name })
        if (updatePreferences) {
            await updatePreferences({ language: profile.language, timezone: profile.timezone })
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // [FIX-2026-08-05] removed old socials + Telegram handlers (moved to IntegrationsTab)

    // [P24] fixed: avatar upload handlers
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast(t('settings.avatarTooBig'), 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            setAvatarPreview(base64);
            handleAvatarUpload(base64);
        };
        reader.onerror = () => showToast(t('settings.avatarReadError'), 'error');
        reader.readAsDataURL(file);
    };

    const handleAvatarUpload = async (base64) => {
        setAvatarLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/me/avatar`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: base64 })
            });
            const data = await res.json();
            if (data.success) {
                updateUser?.({ avatar: data.avatar });
                showToast(t('settings.avatarSaved'), 'success');
            } else {
                showToast(data.message || t('settings.avatarError'), 'error');
            }
        } catch (err) {
            showToast(t('settings.avatarError') + ': ' + err.message, 'error');
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (newTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) root.classList.add('dark');
            else root.classList.add('light');
        } else {
            root.classList.add(newTheme);
        }
        try {
            localStorage.setItem('ai-viral-theme', newTheme);
        } catch {}
    };

    const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all"; // [v6.0] updated

    const renderProfile = () => (
        <div className="space-y-6">
            {/* [v9.9.19-MASTER-AUDIT] Telegram Connect: deep-link привязка к клиентскому боту */}
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Send size={18} className="text-sky-400" /> Telegram
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    Подключите Telegram, чтобы получать уведомления и общаться с OMEGA в боте @{CLIENT_BOT_USERNAME}.
                </p>
                <TelegramConnectButton />
            </div>
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera size={18} className="text-[var(--success)]" /> {t('settings.avatar')}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-3xl font-bold text-[var(--text-inverse)] overflow-hidden relative">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                        ) : (
                            profile.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={avatarLoading}
                            className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {avatarLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                            {t('settings.uploadAvatar')}
                        </button>
                        <p className="text-xs text-[var(--text-muted)] mt-2">{t('settings.avatarHint')}</p>
                    </div>
                </div>
            </div>

            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User size={18} className="text-[var(--success)]" /> {t('settings.profile')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.name')}</label>
                        <input
                            type="text"
                            id="settings-name"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                    <div className="relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.email')}</label>
                        <input
                            type="email"
                            id="settings-email"
                            value={profile.email}
                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                    <div className="md:col-span-2 relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.bio')}</label>
                        <textarea
                            id="settings-bio"
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            rows={3}
                            className={inputClass + ' resize-none'}
                        />
                    </div>
                    <div className="relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.niche')}</label>
                        <select
                            id="settings-niche"
                            value={profile.niche}
                            onChange={e => setProfile({ ...profile, niche: e.target.value })}
                            className={inputClass}
                        >
                            <option value="">{t('settings.selectNiche')}</option>
                            <option value="tech">Технологии</option>
                            <option value="fitness">Фитнес</option>
                            <option value="travel">Путешествия</option>
                            <option value="food">Еда</option>
                            <option value="gaming">Игры</option>
                            <option value="business">Бизнес</option>
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.language')}</label>
                        <select
                            id="settings-language"
                            value={profile.language}
                            onChange={e => setProfile({ ...profile, language: e.target.value })}
                            className={inputClass}
                        >
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.timezone')}</label>
                        <select
                            id="settings-timezone"
                            value={profile.timezone}
                            onChange={e => setProfile({ ...profile, timezone: e.target.value })}
                            className={inputClass}
                        >
                            {['UTC', 'Europe/Moscow', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
            >
                {saved ? <><Check size={18} /> {t('settings.saved')}</> : <><Save size={18} /> {t('settings.saveChanges')}</>}
            </button>
        </div>
    );

    const renderSubscription = () => (
        <div className="space-y-6">
            {userSubscription && userSubscription.isActive && (
                <div className="luxury-card glass p-6 mb-4 border-l-4 border-[var(--success)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text)]">{t('settings.currentPlan')}</h3>
                            <p className="text-[var(--success)] font-bold text-xl mt-1">{userSubscription.planName}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} /> {t('settings.nextBilling')}: {formatDate(userSubscription.nextBillingDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {userSubscription.billingCycle === 'yearly' ? t('settings.yearly') : userSubscription.billingCycle === 'free' ? t('settings.free') : t('settings.monthly')}
                                </span>
                                {/* [MONETIZE-2026-08-04] added: generations remaining */}
                                <span className="flex items-center gap-1">
                                    <Zap size={14} />
                                    {quotaLoading ? '...' : `Генераций: ${quota.used}/${quota.limit}`}
                                </span>
                            </div>
                            {userSubscription.lockedPrice !== plans.find(p => p.id === userSubscription.planId)?.price && (
                                <p className="text-xs text-[var(--warning)] mt-1">
                                    💰 {t('settings.grandfathered', { price: userSubscription.lockedPrice, date: formatDate(userSubscription.nextBillingDate) })}
                                </p>
                            )}
                        </div>
                        <Crown size={40} className="text-[var(--success)]" />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                        {/* [MONETIZE-2026-08-04] added: upgrade/renew actions */}
                        <button
                            onClick={() => document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-4 py-2 bg-[var(--primary)] text-[var(--text-inverse)] rounded-xl text-sm hover:opacity-90 transition-opacity"
                        >
                            Продлить / Сменить тариф
                        </button>
                        <button
                            onClick={handleCancelSubscription}
                            className="px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-xl text-sm hover:bg-[var(--danger)]/30 transition-colors"
                        >
                            {t('settings.cancelSubscription')}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 flex-wrap">
                <div className="inline-flex glass rounded-full p-1">
                    <button
                        onClick={() => setIsYearly(false)}
                        className={`min-h-[44px] px-6 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                    >
                        {t('settings.monthly')}
                    </button>
                    <button
                        onClick={() => setIsYearly(true)}
                        className={`min-h-[44px] px-6 py-2 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                    >
                        {t('settings.yearly')}
                    </button>
                </div>

                {/* [CHECKOUT-UNIFY] селектор валюты скрыт: PlanConfig — RUB-only, legacy USD-цены удалены.
                    Живой провайдер — ЮKassa (RUB); Stripe/PayPal до перевода на PlanConfig не предлагаем. */}

                {paymentMethods.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1 sm:flex-wrap">
                        {paymentMethods.map(method => {
                            // [CHECKOUT-UNIFY] методы вне валютного маппинга (RUB → yookassa) недоступны:
                            // Stripe/PayPal до перевода на PlanConfig показываем, но не даём выбрать
                            const disabled = !method.enabled || !getAllowedMethods(subscriptionCurrency).includes(method.id);
                            const selected = selectedPaymentMethod === method.id;
                            return (
                                <label
                                    key={method.id}
                                    title={method.reason || method.name}
                                    className={`shrink-0 min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2 transition-colors ${selected ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : disabled ? 'opacity-50 cursor-not-allowed text-[var(--text-muted)]' : 'text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer'}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method.id}
                                        checked={selected}
                                        onChange={() => {
                                            if (disabled) return;
                                            setSelectedPaymentMethod(method.id);
                                            setPaymentError(null);
                                            try { localStorage.setItem('selected_payment_method', method.id); } catch {}
                                        }}
                                        disabled={disabled}
                                        className="sr-only"
                                    />
                                    {method.name}
                                    {method.recommended && (
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full leading-none">{t('settings.recommended')}</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            <div id="plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => {
                    const currentPrice = getCurrentPrice(plan);
                    const subscribed = isSubscribedTo(plan.id);
                    const basePrice = fallbackPlanPrice(plan); // [PLANCONFIG-ADMIN] цена PlanConfig
                    const isGrandfathered = userSubscription && userSubscription.planId === plan.id &&
                        userSubscription.lockedPrice !== basePrice && userSubscription.isActive;
                    const isFree = basePrice === 0;
                    const loadingKey = `${plan.id}-${selectedPaymentMethod}`;
                    const isLoading = paymentLoading[loadingKey];

                    return (
                        <div key={plan.id} className={`luxury-card glass p-5 ${subscribed ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/20' : plan.popular ? 'border-[var(--primary)]' : ''}`}>
                            {plan.popular && !subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded-full">
                                    {t('settings.popular')}
                                </div>
                            )}
                            {subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--success)] text-[var(--text-inverse)] text-xs font-bold rounded-full">
                                    {t('settings.active')}
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${plan.color}`} />
                                <h4 className="font-bold text-lg text-[var(--text)] capitalize">{plan.name}</h4>
                            </div>
                            <div className="text-2xl font-bold my-2 text-[var(--text)]">
                                {/* [CHECKOUT-UNIFY] цена PlanConfig — всегда RUB */}
                                {`${currentPrice.toLocaleString('ru-RU')} ₽`}
                                <span className="text-sm text-[var(--text-muted)] font-normal">/{isYearly ? t('settings.yearly') : t('settings.monthly')}</span>
                            </div>
                            {foundingActive && user?.isFoundingMember && basePrice > 0 && !isYearly && (
                                <p className="text-xs text-emerald-400 mb-2">{t('landing.plans.foundingLine', { price: Math.round(basePrice * (1 - foundingDiscountPercent / 100)), percent: foundingDiscountPercent })}</p>
                            )}
                            {/* [PLANCONFIG-ADMIN] «хватит на»: перевод лимитов PlanConfig в понятные единицы */}
                            <p className="text-xs text-[var(--text-muted)] mb-2">
                                {t('landing.plans.enoughFor', {
                                    posts: plan.quotas?.scheduledPostsMax > 0 ? plan.quotas.scheduledPostsMax : '∞',
                                    videos: (plan.quotas?.youtubeUploadsPerDay || 0) * 30,
                                    ai: (plan.quotas?.generationsPerDay || 0) * 30,
                                })}
                            </p>
                            {isGrandfathered && (
                                <p className="text-xs text-[var(--warning)] mb-2">
                                    {t('settings.priceChange', { oldPrice: userSubscription.lockedPrice, newPrice: basePrice, date: formatDate(userSubscription.nextBillingDate) })}
                                </p>
                            )}
                            <ul className="space-y-2 mt-4">
                                {planFeatureLines(plan).map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Check size={14} className="text-[var(--success)]" /> {f}
                                    </li>
                                ))}
                            </ul>
                            {/* [CLIENT-JOURNEY-QA] политика возврата 14 дней — текстом в тарифе (точка оплаты) */}
                            {!isFree && (
                                <p className="text-[11px] text-[var(--text-muted)] mt-3">
                                    {t('settings.refundPolicy')}
                                </p>
                            )}

                            {!isFree && !subscribed ? (
                                <div className="mt-4 space-y-2">
                                    <button
                                        onClick={() => handlePayment(plan)}
                                        disabled={isLoading || !paymentMethods.find(m => m.id === selectedPaymentMethod && m.enabled && getAllowedMethods(subscriptionCurrency).includes(m.id))}
                                        className="w-full py-2 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                        {isLoading ? t('settings.loading') : getPayButtonLabel(selectedPaymentMethod)}
                                    </button>
                                    {paymentError && (
                                        <p className="text-xs text-red-400 text-center">{paymentError}</p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => !subscribed && handleSubscribe(plan)}
                                    disabled={subscribed}
                                    className={`w-full mt-4 py-2 rounded-xl font-medium transition-all min-h-[44px] ${subscribed
                                        ? 'bg-[var(--success)]/20 text-[var(--success)] cursor-default'
                                        : plan.popular
                                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                            : 'glass text-[var(--text)]'
                                        }`}
                                >
                                    {subscribed ? t('settings.active') : t('settings.choosePlan')}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {userSubscription && (
                <div className="luxury-card glass p-6 mb-4">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text)]">{t('settings.subscriptionHistory')}</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 glass rounded-xl">
                            <div>
                                <div className="font-medium text-[var(--text)]">{userSubscription.planName}</div>
                                <div className="text-sm text-[var(--text-muted)]">
                                    {t('settings.fromDate', { date: formatDate(userSubscription.startDate) })} • {userSubscription.billingCycle === 'yearly' ? t('settings.yearly') : userSubscription.billingCycle === 'free' ? t('settings.free') : t('settings.monthly')}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-[var(--success)]">{userSubscription.price} {userSubscription.currency || subscriptionCurrency}</div>
                                <div className={`text-xs ${userSubscription.isActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {userSubscription.isActive ? t('settings.active') : t('settings.cancelled')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* [v6.3] Payment methods status */}
            {(() => {
                const yookassaEnabled = paymentMethods.some(m => m.id === 'yookassa' && m.enabled);
                const stripeEnabled = paymentMethods.some(m => m.id === 'stripe' && m.enabled);
                return (
                    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('settings.paymentMethodsTitle')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">YK</div>
                                    <div>
                                        <div className="text-sm text-white font-medium">{t('paymentMethods.yookassaName') || 'ЮKassa (ЮMoney)'}</div>
                                        <div className="text-xs text-gray-500">{t('paymentMethods.yookassaDescription') || 'Банковские карты, SBP, кошелёк'}</div>
                                    </div>
                                </div>
                                {yookassaEnabled ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> {t('settings.paymentMethodActive')}</span>
                                ) : (
                                    <span className="text-xs text-gray-500">{t('settings.paymentMethodInactive')}</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">ST</div>
                                    <div>
                                        <div className="text-sm text-white font-medium">{t('paymentMethods.stripeName') || 'Stripe'}</div>
                                        <div className="text-xs text-gray-500">{t('paymentMethods.stripeDescription') || 'Международные карты, Apple Pay, Google Pay'}</div>
                                    </div>
                                </div>
                                {stripeEnabled ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> {t('settings.paymentMethodActive')}</span>
                                ) : (
                                    <span className="text-xs text-gray-500">{t('settings.paymentMethodInactive')}</span>
                                )}
                            </div>
                        </div>
                        {(!yookassaEnabled && !stripeEnabled) && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-xs text-amber-400">💡 {t('settings.paymentMethodsNotConfigured')}</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* [TG-FREETEXT-HOTFIX+] карточка поддержки с гарантированным clientBotUrl (fallback aiviral_alerts_bot) */}
            <div className="luxury-card glass p-6">
                <h3 className="text-lg font-semibold mb-2 text-[var(--text)]">{t('settings.subscriptionSupportTitle') || 'Вопросы по подписке?'}</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    {t('settings.subscriptionSupportDesc') || 'Если что-то неясно с тарифом или оплатой — напишите нам в Telegram.'}
                </p>
                <a
                    href={clientBotUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
                >
                    <Send size={16} /> {t('telegram.writeInTelegram') || 'Написать в Telegram'}
                </a>
            </div>
        </div>
    );

    // [FIX-2026-08-05] removed old socials tab (replaced by IntegrationsTab)

    const renderNotifications = () => (
        <div className="luxury-card glass p-6 mb-4 space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                <Bell size={18} className="text-[var(--success)]" /> {t('settings.notifications')}
            </h3>
            {[
                { id: 'email', label: t('settings.notifyEmail'), desc: t('settings.notifyEmailDesc'), icon: Mail },
                { id: 'push', label: t('settings.notifyPush'), desc: t('settings.notifyPushDesc'), icon: Smartphone },
                { id: 'marketing', label: t('settings.notifyMarketing'), desc: t('settings.notifyMarketingDesc'), icon: Sparkles },
                { id: 'weekly', label: t('settings.notifyWeekly'), desc: t('settings.notifyWeeklyDesc'), icon: Zap },
            ].map(item => {
                const Icon = item.icon;
                return (
                    <div key={item.id} className="flex items-center justify-between p-4 glass rounded-xl transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
                                <Icon size={18} className="text-[var(--success)]" />
                            </div>
                            <div>
                                <div className="font-medium text-[var(--text)]">{item.label}</div>
                                <div className="text-sm text-[var(--text-muted)]">{item.desc}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications({ ...notifications, [item.id]: !notifications[item.id] })}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${notifications[item.id] ? 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-white/10'}`}
                            aria-label={notifications[item.id] ? 'Выключить' : 'Включить'}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${notifications[item.id] ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                );
            })}
        </div>
    );

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        const { currentPassword, newPassword, confirmPassword } = passwordForm;

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError(t('settings.fieldRequired'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError(t('settings.passwordMismatch'));
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError(t('settings.passwordMinLength'));
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await response.json();
            if (data.success) {
                setPasswordSuccess(t('settings.passwordChanged'));
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPasswordError(data.message || t('settings.passwordError'));
            }
        } catch (err) {
            setPasswordError(t('settings.serverError'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleEmailChange = async (e) => {
        e.preventDefault();
        if (emailLoading) return;

        setEmailError('');
        setEmailSuccess('');

        const { newEmail, currentPassword } = emailForm;
        if (!newEmail || !currentPassword) {
            setEmailError(t('settings.fieldRequired'));
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
            setEmailError(t('settings.emailInvalid'));
            return;
        }

        setEmailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/change-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newEmail, currentPassword })
            });

            if (response.status === 429) {
                setEmailError(t('settings.rateLimited'));
                return;
            }

            const data = await response.json();
            if (response.ok && data.success) {
                setEmailSuccess(t('settings.emailChanged'));
                if (data.token) localStorage.setItem('token', data.token);
                if (data.user?.email) updateUser({ email: data.user.email });
                setEmailForm({ newEmail: '', currentPassword: '' });
                setTimeout(() => window.location.reload(), 1200);
            } else {
                setEmailError(data.message || data.error || t('settings.emailError'));
            }
        } catch (err) {
            setEmailError(t('settings.networkError'));
        } finally {
            setEmailLoading(false);
        }
    };

    const renderSecurity = () => (
        <div className="space-y-6">
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Lock size={18} className="text-[var(--success)]" /> {t('settings.changePassword')}
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    {passwordError && (
                        <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs">
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-xs">
                            {passwordSuccess}
                        </div>
                    )}

                    {[
                        { key: 'currentPassword', value: passwordForm.currentPassword, setter: setPasswordForm, show: showCurrentPassword, toggle: setShowCurrentPassword, placeholder: t('settings.currentPassword') },
                        { key: 'newPassword', value: passwordForm.newPassword, setter: setPasswordForm, show: showNewPassword, toggle: setShowNewPassword, placeholder: t('settings.newPassword') },
                        { key: 'confirmPassword', value: passwordForm.confirmPassword, setter: setPasswordForm, show: showConfirmPassword, toggle: setShowConfirmPassword, placeholder: t('settings.confirmPassword') },
                    ].map(field => (
                        <div key={field.key} className="relative">
                            <input
                                type={field.show ? 'text' : 'password'}
                                value={field.value}
                                onChange={e => field.setter(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                className={inputClass + ' pr-12'}
                            />
                            <button
                                type="button"
                                onClick={() => field.toggle(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                                aria-label={field.show ? t('settings.hidePassword') : t('settings.showPassword')}
                            >
                                {field.show ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                    >
                        {passwordLoading ? t('settings.saving') : t('settings.updatePassword')}
                    </button>
                </form>
            </div>

            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Mail size={18} className="text-[var(--success)]" /> {t('settings.changeEmail')}
                </h3>
                <form onSubmit={handleEmailChange} className="space-y-3">
                    {emailError && (
                        <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs">
                            {emailError}
                        </div>
                    )}
                    {emailSuccess && (
                        <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-xs">
                            {emailSuccess}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="email"
                            value={emailForm.newEmail}
                            onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                            placeholder={t('settings.email')}
                            className={inputClass}
                        />
                    </div>

                    <div className="relative">
                        <input
                            type={showEmailPassword ? 'text' : 'password'}
                            value={emailForm.currentPassword}
                            onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                            placeholder={t('settings.currentPassword')}
                            className={inputClass + ' pr-12'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowEmailPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        >
                            {showEmailPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={emailLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                    >
                        {emailLoading ? t('settings.saving') : t('settings.saveChanges')}
                    </button>
                </form>
            </div>

            <div className="luxury-card glass p-6 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
                            <Shield size={18} className="text-[var(--success)]" />
                        </div>
                        <div>
                            <div className="font-medium text-[var(--text)]">{t('settings.twoFactor')}</div>
                            <div className="text-sm text-[var(--text-muted)]">{t('settings.twoFactorDesc')}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setTwoFA(!twoFA)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${twoFA ? 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-white/10'}`}
                        aria-label={twoFA ? t('settings.disable2FA') : t('settings.enable2FA')}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${twoFA ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );

    const handleSoundToggle = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        localStorage.setItem('omega_sound_enabled', JSON.stringify(next));
    };

    // [P20] added: watermark handlers
    const handleWatermarkChange = (key, value) => {
        setWatermark(prev => ({ ...prev, [key]: value }));
    };

    const handleGeneratePreview = async () => {
        setWatermarkLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/me/watermark-preview`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: 'https://image.pollinations.ai/prompt/viral%20social%20media%20content%20placeholder?width=1024&height=1024&nologo=true',
                    settings: watermark,
                }),
            });
            const data = await res.json();
            if (data.success && data.data?.url) {
                setWatermarkPreview(data.data.url);
            } else {
                showToast(t('settings.previewError'), 'error');
            }
        } catch (err) {
            showToast(t('settings.previewError') + ': ' + err.message, 'error');
        } finally {
            setWatermarkLoading(false);
        }
    };

    const handleSaveWatermark = async () => {
        setWatermarkLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ watermarkSettings: watermark }),
            });
            const data = await res.json();
            if (data.success) {
                setWatermarkSaved(true);
                setTimeout(() => setWatermarkSaved(false), 2000);
                showToast(t('settings.watermarkSaved'), 'success');
            } else {
                showToast(data.message || t('settings.watermarkSaveError'), 'error');
            }
        } catch (err) {
            showToast(t('settings.watermarkSaveError') + ': ' + err.message, 'error');
        } finally {
            setWatermarkLoading(false);
        }
    };

    const renderWatermark = () => (
        <div className="space-y-6">
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-[var(--text)]">
                    <Stamp size={18} className="text-[var(--success)]" /> {t('settings.watermarkTitle')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    {t('settings.watermarkDesc')}
                </p>

                <div className="flex items-center justify-between p-4 glass rounded-xl mb-4">
                    <div>
                        <div className="font-medium text-[var(--text)]">{t('settings.watermarkEnabled')}</div>
                        <div className="text-xs text-[var(--text-muted)]">{t('settings.watermarkEnabledDesc')}</div>
                    </div>
                    <button
                        onClick={() => handleWatermarkChange('enabled', !watermark.enabled)}
                        disabled={!watermark.enabled && !watermarkEligibility.canDisable}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${watermark.enabled ? 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-white/10'} disabled:opacity-50`}
                        aria-label={watermark.enabled ? t('settings.disable') : t('settings.enable')}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${watermark.enabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {!watermarkEligibility.canDisable && (
                    <div className="p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-xs text-[var(--warning)] mb-4">
                        {t('settings.watermarkUpgrade')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.position')}</label>
                        <select
                            value={watermark.position}
                            onChange={e => handleWatermarkChange('position', e.target.value)}
                            className={inputClass}
                        >
                            <option value="bottom-right">{t('settings.positionBottomRight')}</option>
                            <option value="bottom-left">{t('settings.positionBottomLeft')}</option>
                            <option value="top-right">{t('settings.positionTopRight')}</option>
                            <option value="top-left">{t('settings.positionTopLeft')}</option>
                            <option value="center">{t('settings.positionCenter')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.size')} ({Math.round(watermark.size * 100)}%)</label>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={Math.round(watermark.size * 100)}
                            onChange={e => handleWatermarkChange('size', Number(e.target.value) / 100)}
                            className="w-full accent-[var(--primary)]"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.opacity')} ({Math.round(watermark.opacity * 100)}%)</label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={Math.round(watermark.opacity * 100)}
                            onChange={e => handleWatermarkChange('opacity', Number(e.target.value) / 100)}
                            className="w-full accent-[var(--primary)]"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleGeneratePreview}
                        disabled={watermarkLoading}
                        className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm hover:bg-[var(--primary-soft)] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {watermarkLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        {t('settings.generatePreview')}
                    </button>
                    <button
                        onClick={handleSaveWatermark}
                        disabled={watermarkLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {watermarkSaved ? <Check size={16} /> : <Save size={16} />}
                        {watermarkSaved ? t('settings.saved') : t('settings.saveChanges')}
                    </button>
                </div>
            </div>

            {watermarkPreview && (
                <div className="luxury-card glass p-6 mb-4">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text)]">{t('settings.preview')}</h3>
                    <div className="rounded-xl overflow-hidden bg-[var(--surface)] max-w-md">
                        <img src={watermarkPreview} alt="Watermark preview" className="w-full h-auto" />
                    </div>
                </div>
            )}
        </div>
    );

    // [v9.9.19.17.7] added: scheduler auto-clean TTL settings
    const handleSaveAutoCleanTTL = async () => {
        setAutoCleanSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: { autoCleanTTL } })
            });
            const data = await response.json();
            if (data.success) {
                if (updatePreferences) {
                    await updatePreferences({ autoCleanTTL });
                }
                showToast(t('settings.autoCleanTTLSaved'), 'success');
            } else {
                showToast(data.message || t('settings.autoCleanTTLError'), 'error');
            }
        } catch (err) {
            showToast(t('settings.autoCleanTTLError') + ': ' + err.message, 'error');
        } finally {
            setAutoCleanSaving(false);
        }
    };

    const renderScheduler = () => (
        <div className="luxury-card glass p-6 mb-4 space-y-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-[var(--text)]">
                <Calendar size={18} className="text-[var(--success)]" /> {t('settings.schedulerAutoCleanTitle')}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
                {t('settings.autoCleanTTLHint')}
            </p>

            <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                    {t('settings.autoCleanTTLLabel')}
                </label>
                <select
                    value={autoCleanTTL}
                    onChange={e => setAutoCleanTTL(Number(e.target.value))}
                    className={inputClass}
                >
                    <option value={0}>{t('settings.autoCleanTTLImmediately')}</option>
                    <option value={15}>{t('settings.autoCleanTTL15min')}</option>
                    <option value={60}>{t('settings.autoCleanTTL1hour')}</option>
                    <option value={-1}>{t('settings.autoCleanTTLNever')}</option>
                </select>
            </div>

            <button
                onClick={handleSaveAutoCleanTTL}
                disabled={autoCleanSaving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
                {autoCleanSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {autoCleanSaving ? t('settings.saving') : t('settings.saveChanges')}
            </button>
        </div>
    );

    const handleAnimationsToggle = () => {
        const next = !animationsEnabled;
        setAnimationsEnabled(next);
        localStorage.setItem('omega_animations_enabled', JSON.stringify(next));
        document.documentElement.classList.toggle('reduce-motion', !next);
    };

    const renderAppearance = () => (
        <div className="luxury-card glass p-6 mb-4 space-y-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                <Palette size={18} className="text-[var(--success)]" /> {t('settings.theme')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { id: 'dark', label: t('settings.dark'), icon: Moon },
                    { id: 'light', label: t('settings.light'), icon: Sun },
                    { id: 'system', label: t('settings.system'), icon: Monitor },
                ].map(opt => {
                    const Icon = opt.icon;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleThemeChange(opt.id)}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === opt.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`}
                        >
                            <Icon size={24} className={opt.id === 'light' ? 'text-yellow-400' : 'text-[var(--text-muted)]'} />
                            <span className="text-sm font-medium text-[var(--text)]">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="border-t border-[var(--border)] pt-6">
                <label className="text-xs text-[var(--text-muted)] mb-1 block">{t('settings.language')}</label>
                <select
                    value={profile.language}
                    onChange={e => { setProfile({ ...profile, language: e.target.value }); i18n.changeLanguage(e.target.value); }}
                    className={inputClass}
                >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                </select>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    {soundEnabled ? <Volume2 size={18} className="text-[var(--success)]" /> : <VolumeX size={18} className="text-[var(--text-muted)]" />}
                    {t('settings.soundTitle')}
                </h3>
                <div className="flex items-center justify-between p-4 glass rounded-xl transition-all">
                    <div>
                        <div className="font-medium text-[var(--text)]">{t('settings.soundToggleLabel')}</div>
                        <div className="text-sm text-[var(--text-muted)]">{t('settings.soundDescription')}</div>
                    </div>
                    <button
                        onClick={handleSoundToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${soundEnabled ? 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-white/10'}`}
                        aria-label={soundEnabled ? t('settings.disableSounds') : t('settings.enableSounds')}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${soundEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
                <div className="flex items-center justify-between p-4 glass rounded-xl transition-all">
                    <div>
                        <div className="font-medium text-[var(--text)]">{t('settings.animations')}</div>
                        <div className="text-sm text-[var(--text-muted)]">{t('settings.animationsDesc')}</div>
                    </div>
                    <button
                        onClick={handleAnimationsToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${animationsEnabled ? 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-white/10'}`}
                        aria-label={animationsEnabled ? t('settings.disableAnimations') : t('settings.enableAnimations')}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${animationsEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );

    // [19.13-lite-PAYMENTS-NPD] payments history tab
    const renderPayments = () => {
        const locale = i18n.language || 'ru';
        const formatPaymentDate = (dateString) => {
            if (!dateString) return '—';
            const d = new Date(dateString);
            return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(locale);
        };
        const statusLabel = (status) => {
            switch (status) {
                case 'succeeded': return t('payments.statusSucceeded');
                case 'canceled': return t('payments.statusCanceled');
                case 'refunded': return t('payments.statusRefunded');
                default: return t('payments.statusPending');
            }
        };
        const statusClass = (status) => {
            switch (status) {
                case 'succeeded': return 'bg-[var(--success)]/20 text-[var(--success)]';
                case 'canceled':
                case 'refunded': return 'bg-[var(--danger)]/20 text-[var(--danger)]';
                default: return 'bg-[var(--warning)]/20 text-[var(--warning)]';
            }
        };
        return (
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-[var(--primary)]" />
                    {t('payments.title')}
                </h3>

                {paymentsLoading && (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                )}

                {!paymentsLoading && paymentsError && (
                    <div className="glass rounded-2xl p-6 text-center text-[var(--danger)]">
                        {t('payments.resendError')}
                    </div>
                )}

                {!paymentsLoading && !paymentsError && payments.length === 0 && (
                    <div className="glass rounded-2xl p-8 text-center text-[var(--text-muted)]">
                        {t('payments.empty')}
                    </div>
                )}

                {!paymentsLoading && !paymentsError && payments.length > 0 && (
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] glass">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">{t('payments.colDate')}</th>
                                    <th className="px-4 py-3 font-medium">{t('payments.colPlan')}</th>
                                    <th className="px-4 py-3 font-medium">{t('payments.colAmount')}</th>
                                    <th className="px-4 py-3 font-medium">{t('payments.colStatus')}</th>
                                    <th className="px-4 py-3 font-medium">{t('payments.colReceipt')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {payments.map((p) => (
                                    <tr key={p._id} className="hover:bg-[var(--primary-soft)]/30 transition-colors">
                                        <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                                            {formatPaymentDate(p.paidAt || p.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text)]">
                                            <span className="block max-w-[220px] truncate" title={p.description || p.planId || ''}>
                                                {p.description || p.planId || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text)] whitespace-nowrap">
                                            {p.amount} {p.currency}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusClass(p.status)}`}>
                                                {statusLabel(p.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.receiptStatus === 'registered' && (
                                                <span className="text-[var(--success)] flex items-center gap-1 whitespace-nowrap">
                                                    <Check size={14} /> {t('payments.receiptOk')}
                                                </span>
                                            )}
                                            {p.receiptStatus === 'failed' && (
                                                <div className="flex flex-col items-start gap-2">
                                                    <span className="text-[var(--danger)] flex items-center gap-1 whitespace-nowrap">
                                                        ✗ {t('payments.receiptFailed')}
                                                    </span>
                                                    {resentReceiptIds[p._id] ? (
                                                        <span className="text-xs text-[var(--success)]">{t('payments.receiptSent')}</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleResendReceipt(p._id)}
                                                            disabled={resendingReceiptId === p._id}
                                                            className="min-h-[40px] px-4 py-2.5 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {resendingReceiptId === p._id && <Loader2 size={14} className="animate-spin" />}
                                                            {t('payments.resendReceipt')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {(p.receiptStatus === 'pending' || !p.receiptStatus) && (
                                                <span className="text-[var(--text-muted)] whitespace-nowrap">— {t('payments.receiptPending')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return renderProfile();
            case 'subscription': return renderSubscription();
            case 'payments': return renderPayments(); // [19.13-lite-PAYMENTS-NPD]
            case 'integrations': return <IntegrationsTab onOpenYouTube={() => setActiveTab('youtube')} />; // [FIX-2026-08-05] unified socials tab
            case 'youtube': return <YouTubeSettingsTab />;
            case 'notifications': return renderNotifications();
            case 'security': return renderSecurity();
            case 'addons': return <AddonMarketplace />;
            case 'appearance': return renderAppearance();
            case 'watermark': return renderWatermark();
            case 'scheduler': return renderScheduler(); // [v9.9.19.17.7] scheduler settings
            default: return renderProfile();
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                        <Palette size={20} className="text-[var(--text-inverse)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">{t('settings.title')}</h1>
                        <p className="text-[var(--text-muted)] text-sm">{t('settings.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 flex-shrink-0">
                    {/* [v6.0] added: glass sidebar */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-xl mb-1 ${
                                        isActive
                                            ? 'bg-violet-500/10 text-violet-300 border-r-2 border-violet-500'
                                            : 'text-[var(--text-muted)] border-r-2 border-transparent hover:bg-white/5'
                                    }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-violet-400' : ''} />
                                    <span className={`font-medium ${isActive ? 'bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent' : ''}`}>{tab.label}</span>
                                    {isActive && <ChevronRight size={14} className="ml-auto text-violet-400" />}
                                </button>
                            );
                        })}
                        <div className="border-t border-white/10 mt-2 pt-2">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all rounded-xl"
                            >
                                <LogOut size={18} /> {t('settings.logout')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {/* [v6.0] added: glass content wrapper */}
                    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
