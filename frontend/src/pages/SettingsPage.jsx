import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
    User, Diamond, Link2, Bell, Shield, Palette, LogOut,
    Camera, Save, Check, Youtube, Music, Instagram, Twitter,
    Send, Globe, Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff,
    ChevronRight, Sparkles, Crown, Zap, Users, Calendar, CreditCard,
    Wallet, Bitcoin, Volume2, VolumeX, Linkedin, Loader2, Monitor,
    Stamp
} from 'lucide-react';

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
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [userSubscription, setUserSubscription] = useState(() => {
        const saved = localStorage.getItem('user_subscription');
        return saved ? JSON.parse(saved) : null;
    });
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
    const [socials, setSocials] = useState({
        instagram: { username: '', link: '', published: false },
        tiktok: { username: '', link: '', published: false },
        youtube: { username: '', link: '', published: false },
        telegram: { username: '', link: '', published: false },
        vk: { username: '', link: '', published: false },
        twitter: { username: '', link: '', published: false },
        linkedin: { username: '', link: '', published: false },
    });
    const [savingSocials, setSavingSocials] = useState(false);
    const [socialsSaved, setSocialsSaved] = useState(false);

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

    useEffect(() => {
        if (user?.preferences?.timezone && user.preferences.timezone !== profile.timezone) {
            setProfile(p => ({ ...p, timezone: user.preferences.timezone }))
        }
    }, [user?.preferences?.timezone])

    // [P16-FIX] added: load socials from user object
    useEffect(() => {
        if (user?.socials) {
            setSocials(prev => ({ ...prev, ...Object.fromEntries(
                Object.entries(user.socials).map(([k, v]) => [k, typeof v === 'string' ? { username: v, link: '', published: false } : { ...v, published: v.published ?? false }])
            )}))
        }
    }, [user?.socials])

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

    const [plans, setPlans] = useState(() => {
        const saved = localStorage.getItem('owner_subscriptions');
        if (saved) {
            const parsed = JSON.parse(saved);
            return [
                { id: 'free', name: parsed[0]?.name || 'Free', price: parsed[0]?.price || 0, color: 'from-gray-600 to-gray-700', features: parsed[0]?.features || ['1 проект', 'Базовая аналитика', 'Email поддержка'] },
                { id: 'creator', name: parsed[1]?.name || 'Creator', price: parsed[1]?.price || 10, color: 'from-blue-500 to-blue-600', features: parsed[1]?.features || ['5 проектов', 'Расширенная аналитика', 'Приоритетная поддержка'] },
                { id: 'pro', name: parsed[2]?.name || 'Pro', price: parsed[2]?.price || 30, color: 'from-emerald-500 to-teal-600', features: parsed[2]?.features || ['20 проектов', 'AI генерация', 'API доступ'], popular: true },
                { id: 'agency', name: parsed[3]?.name || 'Agency', price: parsed[3]?.price || 100, color: 'from-[#00ff41] to-[#00cc33]', features: parsed[3]?.features || ['Безлимит проектов', 'White label', 'Выделенный менеджер'] },
                { id: 'enterprise', name: parsed[4]?.name || 'Enterprise', price: parsed[4]?.price || 300, color: 'from-purple-500 to-pink-600', features: parsed[4]?.features || ['Кастом решения', 'On-premise', 'SLA 99.9%'] },
            ];
        }
        return [
            { id: 'free', name: 'Free', price: 0, color: 'from-gray-600 to-gray-700', features: ['1 проект', 'Базовая аналитика', 'Email поддержка'] },
            { id: 'creator', name: 'Creator', price: 10, color: 'from-blue-500 to-blue-600', features: ['5 проектов', 'Расширенная аналитика', 'Приоритетная поддержка'] },
            { id: 'pro', name: 'Pro', price: 30, color: 'from-emerald-500 to-teal-600', features: ['20 проектов', 'AI генерация', 'API доступ'], popular: true },
            { id: 'agency', name: 'Agency', price: 100, color: 'from-[#00ff41] to-[#00cc33]', features: ['Безлимит проектов', 'White label', 'Выделенный менеджер'] },
            { id: 'enterprise', name: 'Enterprise', price: 300, color: 'from-purple-500 to-pink-600', features: ['Кастом решения', 'On-premise', 'SLA 99.9%'] },
        ];
    });

    const getYearlyPrice = (monthlyPrice) => monthlyPrice * 10;

    const getCurrentPrice = (plan) => {
        if (userSubscription && userSubscription.planId === plan.id && userSubscription.isActive) {
            const now = new Date();
            const nextBilling = new Date(userSubscription.nextBillingDate);
            if (now < nextBilling) {
                return isYearly ? getYearlyPrice(userSubscription.lockedPrice) : userSubscription.lockedPrice;
            }
        }
        return isYearly ? getYearlyPrice(plan.price) : plan.price;
    };

    const handleStripePayment = async (plan) => {
        try {
            setPaymentLoading(true);
            const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan.name,
                    price: isYearly ? getYearlyPrice(plan.price) : plan.price,
                    isYearly,
                    userId: user?.id || 'anonymous'
                })
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                showToast('Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (err) {
            showToast('Ошибка оплаты: ' + err.message, 'error');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handlePayPalPayment = async (plan) => {
        try {
            setPaymentLoading(true);
            const token = localStorage.getItem('token') || '';
            const response = await fetch(`${API_BASE_URL}/paypal/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    planId: plan.name,
                    amount: isYearly ? getYearlyPrice(plan.price) : plan.price,
                    currency: 'USD',
                    description: `${isYearly ? 'Yearly' : 'Monthly'} ${plan.name} subscription`,
                })
            });
            const data = await response.json();
            if (data.approvalUrl) {
                window.location.href = data.approvalUrl;
            } else {
                showToast('PayPal error: ' + (data.message || data.error || 'Unknown'), 'error');
            }
        } catch (err) {
            showToast('PayPal error: ' + err.message, 'error');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleCryptoPayment = async (plan) => {
        try {
            setPaymentLoading(true);
            const response = await fetch(`${API_BASE_URL}/payments/crypto-charge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `AI Viral Studio — ${plan.name}`,
                    description: `${isYearly ? 'Годовая' : 'Месячная'} подписка ${plan.name}`,
                    price: isYearly ? getYearlyPrice(plan.price) : plan.price,
                    currency: 'USD'
                })
            });
            const data = await response.json();
            if (data.hosted_url) {
                window.open(data.hosted_url, '_blank');
            } else {
                showToast('Ошибка создания крипто-платежа: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (err) {
            showToast('Ошибка крипто-оплаты: ' + err.message, 'error');
        } finally {
            setPaymentLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    };

    const handleSubscribe = (plan) => {
        if (plan.price > 0) {
            handleStripePayment(plan);
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
        { id: 'socials', label: t('settings.socials'), icon: Link2 },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette },
        { id: 'watermark', label: t('settings.watermark'), icon: Stamp },
    ];

    const socialPlatforms = [
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', usernamePlaceholder: '@channel', linkPlaceholder: 'youtube.com/channel/...' },
        { id: 'tiktok', name: 'TikTok', icon: Music, color: '#00f2ea', usernamePlaceholder: '@username', linkPlaceholder: 'tiktok.com/@username' },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', usernamePlaceholder: '@username', linkPlaceholder: 'instagram.com/username' },
        { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: '#1DA1F2', usernamePlaceholder: '@username', linkPlaceholder: 'twitter.com/username' },
        { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088cc', usernamePlaceholder: '@username', linkPlaceholder: 't.me/username' },
        { id: 'vk', name: 'VK', icon: Globe, color: '#4C75A3', usernamePlaceholder: 'id/username', linkPlaceholder: 'vk.com/username' },
        { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', usernamePlaceholder: 'username', linkPlaceholder: 'linkedin.com/in/username' },
    ];

    const handleSave = async () => {
        if (updateUser) updateUser({ name: profile.name })
        if (updatePreferences) {
            await updatePreferences({ language: profile.language, timezone: profile.timezone })
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // [P16-FIX] added: save social networks to backend
    const handleSaveSocials = async () => {
        setSavingSocials(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/me/socials`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(socials),
            });
            if (!res.ok) throw new Error('Network error');
            setSocialsSaved(true);
            setTimeout(() => setSocialsSaved(false), 2000);
            showToast(t('settings.socialsSaved'), 'success');
        } catch (err) {
            console.warn('[SettingsPage] save socials failed:', err.message);
            showToast(t('settings.socialsSavedLocal'), 'info');
            setSocialsSaved(true);
            setTimeout(() => setSocialsSaved(false), 2000);
        } finally {
            setSavingSocials(false);
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

    const inputClass = "w-full px-4 py-3 glass rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/50 bg-transparent transition-all";

    const renderProfile = () => (
        <div className="space-y-6">
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera size={18} className="text-[var(--success)]" /> {t('settings.avatar')}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-3xl font-bold text-[var(--text-inverse)]">
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2">
                            <Camera size={14} /> {t('settings.profile')}
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
                            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} /> {t('settings.nextBilling')}: {formatDate(userSubscription.nextBillingDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {userSubscription.billingCycle === 'yearly' ? t('settings.yearly') : userSubscription.billingCycle === 'free' ? t('settings.free') : t('settings.monthly')}
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
                    <button
                        onClick={handleCancelSubscription}
                        className="mt-4 px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-xl text-sm hover:bg-[var(--danger)]/30 transition-colors"
                    >
                        {t('settings.cancelSubscription')}
                    </button>
                </div>
            )}

            <div className="flex justify-center">
                <div className="inline-flex glass rounded-full p-1">
                    <button
                        onClick={() => setIsYearly(false)}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                    >
                        {t('settings.monthly')}
                    </button>
                    <button
                        onClick={() => setIsYearly(true)}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                    >
                        {t('settings.yearly')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => {
                    const currentPrice = getCurrentPrice(plan);
                    const subscribed = isSubscribedTo(plan.id);
                    const isGrandfathered = userSubscription && userSubscription.planId === plan.id &&
                        userSubscription.lockedPrice !== plan.price && userSubscription.isActive;

                    return (
                        <div key={plan.id} className={`luxury-card glass p-5 ${subscribed ? 'border-[var(--success)]' : plan.popular ? 'border-[var(--primary)]' : ''}`}>
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
                                ${currentPrice}
                                <span className="text-sm text-[var(--text-muted)] font-normal">/{isYearly ? t('settings.yearly') : t('settings.monthly')}</span>
                            </div>
                            {isGrandfathered && (
                                <p className="text-xs text-[var(--warning)] mb-2">
                                    {t('settings.priceChange', { oldPrice: userSubscription.lockedPrice, newPrice: plan.price, date: formatDate(userSubscription.nextBillingDate) })}
                                </p>
                            )}
                            <ul className="space-y-2 mt-4">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Check size={14} className="text-[var(--success)]" /> {f}
                                    </li>
                                ))}
                            </ul>

                            {plan.price > 0 && !subscribed ? (
                                <div className="space-y-2 mt-4">
                                    <button
                                        onClick={() => handleStripePayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <CreditCard size={16} />
                                        {paymentLoading ? t('settings.loading') : `${t('settings.pay')} $${currentPrice}`}
                                    </button>
                                    <button
                                        onClick={() => handleCryptoPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-xl font-medium transition-all glass text-[var(--text)] border border-[var(--border)] flex items-center justify-center gap-2"
                                    >
                                        <Bitcoin size={16} className="text-orange-400" />
                                        {paymentLoading ? t('settings.loading') : t('settings.payWithCrypto')}
                                    </button>
                                    <button
                                        onClick={() => handlePayPalPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-xl font-medium transition-all bg-[#003087]/80 hover:bg-[#002a6e] text-white flex items-center justify-center gap-2"
                                    >
                                        <Wallet size={16} />
                                        {paymentLoading ? t('settings.loading') : t('settings.payWithPayPal')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => !subscribed && handleSubscribe(plan)}
                                    disabled={subscribed}
                                    className={`w-full mt-4 py-2 rounded-xl font-medium transition-all ${subscribed
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
                                <div className="font-bold text-[var(--success)]">${userSubscription.price}</div>
                                <div className={`text-xs ${userSubscription.isActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {userSubscription.isActive ? t('settings.active') : t('settings.cancelled')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSocials = () => (
        <div className="space-y-4">
            <div className="luxury-card glass p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Link2 size={18} className="text-[var(--success)]" /> {t('settings.socials')}
                </h3>
                <div className="space-y-3">
                    {socialPlatforms.map(platform => {
                        const Icon = platform.icon;
                        const data = socials[platform.id] || { username: '', link: '', published: false };
                        const isConnected = data.username || data.link;
                        return (
                            <div key={platform.id} className="flex items-start gap-4 p-4 glass rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: platform.color + '20' }}>
                                    <Icon size={24} style={{ color: platform.color }} />
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <div className="font-medium text-[var(--text)] text-sm mb-1">{platform.name}</div>
                                        <input
                                            type="text"
                                            value={data.username}
                                            onChange={e => setSocials({ ...socials, [platform.id]: { ...data, username: e.target.value } })}
                                            placeholder={platform.usernamePlaceholder}
                                            className="w-full px-3 py-2 glass rounded-lg border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <div className="font-medium text-[var(--text-muted)] text-sm mb-1">{t('settings.socialLink')}</div>
                                        <input
                                            type="text"
                                            value={data.link}
                                            onChange={e => setSocials({ ...socials, [platform.id]: { ...data, link: e.target.value } })}
                                            placeholder={platform.linkPlaceholder}
                                            className="w-full px-3 py-2 glass rounded-lg border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                    <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-2 ${isConnected ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                                    <button
                                        onClick={() => setSocials({ ...socials, [platform.id]: { ...data, published: !data.published } })}
                                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${data.published ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'glass text-[var(--text-muted)] border-[var(--border)]'}`}
                                    >
                                        {t('settings.publish')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={handleSaveSocials}
                    disabled={savingSocials}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {savingSocials ? <Loader2 size={18} className="animate-spin" /> : socialsSaved ? <><Check size={18} /> {t('settings.saved')}</> : <><Save size={18} /> {t('settings.saveChanges')}</>}
                </button>
            </div>
        </div>
    );

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
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${notifications[item.id] ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
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
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${twoFA ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
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
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${watermark.enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
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
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
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
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${animationsEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
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
            case 'socials': return renderSocials();
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
                    <div className="glass rounded-2xl p-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-xl mb-1 ${activeTab === tab.id ? 'bg-[var(--primary-soft)] text-[var(--primary)] border-l-[3px] border-[var(--primary)]' : 'text-[var(--text-muted)] border-l-[3px] border-transparent hover:bg-[var(--surface)]'}`}
                                >
                                    <Icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                    {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                                </button>
                            );
                        })}
                        <div className="border-t border-[var(--border)] mt-2 pt-2">
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
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
