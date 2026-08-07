import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { PLANS, getPrice } from '../config/plans.js'; // [P24] fixed: unified plans config
import IntegrationsTab from './settings/IntegrationsTab.jsx'; // [SOCIAL-v5.1] added
import PaymentMethodSelector from '../components/payments/PaymentMethodSelector.jsx'; // [v6.6-HOTFIX-PAYMENTS] multi-payment selector
import {
    User, Diamond, Link2, Bell, Shield, Palette, LogOut,
    Camera, Save, Check, Youtube, Music, Instagram, Twitter,
    Send, Globe, Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff,
    ChevronRight, Sparkles, Crown, Zap, Users, Calendar, CreditCard,
    Wallet, Bitcoin, Volume2, VolumeX, Linkedin, Loader2, Monitor,
    Stamp
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

function SettingsPage() {
    const { t } = useTranslation();
    const { user, logout, updateUser, updatePreferences } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
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
    const [showPaymentSelector, setShowPaymentSelector] = useState(false); // [v6.6-HOTFIX-PAYMENTS]
    const [selectedPlan, setSelectedPlan] = useState(null); // [v6.6-HOTFIX-PAYMENTS]
    const [userSubscription, setUserSubscription] = useState(() => {
        const saved = localStorage.getItem('user_subscription');
        return saved ? JSON.parse(saved) : null;
    });
    // [MONETIZE-2026-08-04] added: quota state for subscription card
    const [quota, setQuota] = useState({ used: 0, limit: PLANS.free.generations });
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

    useEffect(() => {
        if (user?.preferences?.timezone && user.preferences.timezone !== profile.timezone) {
            setProfile(p => ({ ...p, timezone: user.preferences.timezone }))
        }
    }, [user?.preferences?.timezone])

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

    // [MONETIZE-2026-08-04] added: load current quota
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setQuotaLoading(true);
        fetch(`${API_BASE_URL}/users/me/quota`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const q = d?.data || d || {};
                setQuota({ used: q.generationsUsed || 0, limit: q.generationsLimit || PLANS.free.generations });
            })
            .catch(() => setQuota({ used: 0, limit: PLANS.free.generations }))
            .finally(() => setQuotaLoading(false));
    }, []);

    // [FIX-2026-08-05] removed old Telegram settings loader (moved to IntegrationsTab)

    const [subscriptionCurrency, setSubscriptionCurrency] = useState(user?.preferences?.currency || 'RUB');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('yookassa');
    // [PLANS-SYNC] added: load plans from backend API
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/plans?currency=${subscriptionCurrency}`)
            .then(r => r.json())
            .then(data => {
                const loaded = (data.plans || []).map(p => ({
                    ...p,
                    color: PLAN_COLORS[p.id] || 'from-gray-600 to-gray-700',
                    popular: p.id === 'pro',
                }));
                setPlans(loaded);
            })
            .catch(err => {
                console.warn('[SettingsPage] failed to load plans:', err.message);
                setPlans(Object.values(PLANS).map(p => ({ ...p, color: PLAN_COLORS[p.id] || 'from-gray-600 to-gray-700', popular: p.id === 'pro' })));
            });
    }, [subscriptionCurrency]);

    const getYearlyPrice = (monthlyPrice) => monthlyPrice * 10;

    // [MASTER-v5.6] fixed: use API-loaded price, not static config
    const getCurrentPrice = (plan) => {
        const basePrice = plan?.price ?? getPrice(plan, subscriptionCurrency);
        if (userSubscription && userSubscription.planId === plan.id && userSubscription.isActive) {
            const now = new Date();
            const nextBilling = new Date(userSubscription.nextBillingDate);
            if (now < nextBilling) {
                return isYearly ? getYearlyPrice(userSubscription.lockedPrice) : userSubscription.lockedPrice;
            }
        }
        return isYearly ? getYearlyPrice(basePrice) : basePrice;
    };

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await fetch(`${API_BASE_URL}/subscriptions/config`);
                const json = await res.json();
                if (json.success) {
                    setPaymentMethods(json.paymentMethods || []);
                    setSelectedPaymentMethod(prev => json.paymentMethods?.find(m => m.id === prev)?.id || json.paymentMethods?.[0]?.id || 'yookassa');
                    if (json.currency && !user?.preferences?.currency) setSubscriptionCurrency(json.currency);
                }
            } catch (err) {
                console.error('[SettingsPage:loadConfig]', err);
            }
        }
        loadConfig();
    }, []); // [P24] fixed: load currency + payment methods from backend

    const setLoading = (planId, loading) => {
        setPaymentLoading(prev => ({ ...prev, [planId]: loading }));
    };

    const handlePayment = (plan) => {
        // [v6.6-HOTFIX-PAYMENTS] open multi-provider selector instead of direct fetch
        if ((plan.priceRUB === 0 && plan.priceUSD === 0) || plan.price === 0) {
            handleSubscribe(plan);
            return;
        }
        setSelectedPlan(plan);
        setShowPaymentSelector(true);
    };

    const showToast = (message, type = 'info') => {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.warn('[SettingsPage] Toast not available:', message);
        }
    };

    const handleSubscribe = (plan) => {
        if (getPrice(plan, subscriptionCurrency) > 0) {
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
        { id: 'integrations', label: t('settings.integrations'), icon: Link2 }, // [FIX-2026-08-05] only one socials tab
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette },
        { id: 'watermark', label: t('settings.watermark'), icon: Stamp },
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

                <select
                    value={subscriptionCurrency}
                    onChange={e => setSubscriptionCurrency(e.target.value)}
                    className="min-h-[44px] px-4 py-2 glass rounded-full text-sm text-[var(--text)] bg-transparent outline-none border border-[var(--border)]"
                >
                    {CURRENCIES.map(cur => (
                        <option key={cur.value} value={cur.value} className="bg-[var(--card)]">{cur.label}</option>
                    ))}
                </select>

                {paymentMethods.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {paymentMethods.map(method => (
                            <label
                                key={method.id}
                                className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2 cursor-pointer transition-colors ${selectedPaymentMethod === method.id ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            >
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={method.id}
                                    checked={selectedPaymentMethod === method.id}
                                    onChange={() => setSelectedPaymentMethod(method.id)}
                                    className="sr-only"
                                />
                                {method.name}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div id="plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => {
                    const currentPrice = getCurrentPrice(plan);
                    const subscribed = isSubscribedTo(plan.id);
                    const basePrice = plan?.price ?? getPrice(plan, subscriptionCurrency); // [MASTER-v5.6] use API price
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
                                {subscriptionCurrency === 'RUB'
                                    ? `${currentPrice.toLocaleString('ru-RU')} ₽`
                                    : `${currentPrice.toLocaleString('en-US')} ${subscriptionCurrency === 'EUR' ? '€' : subscriptionCurrency === 'UAH' ? '₴' : subscriptionCurrency === 'KZT' ? '₸' : '$'}`}
                                <span className="text-sm text-[var(--text-muted)] font-normal">/{isYearly ? t('settings.yearly') : t('settings.monthly')}</span>
                            </div>
                            {isGrandfathered && (
                                <p className="text-xs text-[var(--warning)] mb-2">
                                    {t('settings.priceChange', { oldPrice: userSubscription.lockedPrice, newPrice: basePrice, date: formatDate(userSubscription.nextBillingDate) })}
                                </p>
                            )}
                            <ul className="space-y-2 mt-4">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Check size={14} className="text-[var(--success)]" /> {f}
                                    </li>
                                ))}
                            </ul>

                            {!isFree && !subscribed ? (
                                <button
                                    onClick={() => handlePayment(plan)}
                                    disabled={isLoading}
                                    className="w-full mt-4 py-2 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                    {isLoading ? t('settings.loading') : `${t('settings.pay')} ${selectedPaymentMethod === 'yookassa' ? 'ЮKassa' : selectedPaymentMethod === 'stripe' ? 'Stripe' : selectedPaymentMethod === 'paypal' ? 'PayPal' : 'Crypto'}`}
                                </button>
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
                const yookassaEnabled = paymentMethods.some(m => m.id === 'yookassa');
                const stripeEnabled = paymentMethods.some(m => m.id === 'stripe');
                return (
                    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">💳 Способы оплаты</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">YK</div>
                                    <div>
                                        <div className="text-sm text-white font-medium">ЮKassa (ЮMoney)</div>
                                        <div className="text-xs text-gray-500">Банковские карты, SBP, кошелёк</div>
                                    </div>
                                </div>
                                {yookassaEnabled ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Активно</span>
                                ) : (
                                    <span className="text-xs text-gray-500">Не настроено администратором</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">ST</div>
                                    <div>
                                        <div className="text-sm text-white font-medium">Stripe</div>
                                        <div className="text-xs text-gray-500">Международные карты, Apple Pay, Google Pay</div>
                                    </div>
                                </div>
                                {stripeEnabled ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Активно</span>
                                ) : (
                                    <span className="text-xs text-gray-500">Не настроено администратором</span>
                                )}
                            </div>
                        </div>
                        {(!yookassaEnabled && !stripeEnabled) && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-xs text-amber-400">💡 Платёжные системы не настроены. Обратитесь к владельцу платформы для активации оплаты.</p>
                            </div>
                        )}
                        {!stripeEnabled && (
                            <div className="glass-luxury rounded-xl p-4 mt-4">
                                <p className="text-[var(--text-muted)] text-sm">💳 {t('stripe.unavailable') || 'Оплата Stripe временно недоступна. Используйте бесплатный тариф или свяжитесь с поддержкой.'}</p>
                                <button
                                    className="mt-2 text-[var(--primary)] text-sm hover:underline"
                                    onClick={() => showToast(t('settings.supportContact') || 'Telegram: @your_support', 'info')}
                                >
                                    {t('settings.writeSupport') || 'Написать в поддержку'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })()}
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

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return renderProfile();
            case 'subscription': return renderSubscription();
            case 'integrations': return <IntegrationsTab />; // [FIX-2026-08-05] unified socials tab
            case 'notifications': return renderNotifications();
            case 'security': return renderSecurity();
            case 'appearance': return renderAppearance();
            case 'watermark': return renderWatermark();
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
            {showPaymentSelector && selectedPlan && (
                <PaymentMethodSelector
                    plan={selectedPlan}
                    onClose={() => setShowPaymentSelector(false)}
                    userId={user?.id || user?._id}
                    email={user?.email}
                />
            )}
        </div>
    );
}

export default SettingsPage;
