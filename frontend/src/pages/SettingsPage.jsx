import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import {
    User, Diamond, Link2, Bell, Shield, Palette, LogOut,
    Camera, Save, Check, Youtube, Music, Instagram, Twitter,
    Send, Globe, Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff,
    ChevronRight, Sparkles, Crown, Zap, Users, Calendar, CreditCard,
    Wallet, Bitcoin, Volume2, VolumeX
} from 'lucide-react';

function SettingsPage() {
    const { user, logout, updateUser } = useAuth();
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
    const [profile, setProfile] = useState({
        name: user?.name || 'Owner',
        email: user?.email || 'owner@ai-viral.com',
        bio: '',
        niche: '',
        language: user?.preferences?.language || 'ru',
        timezone: user?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'
    });
    const [socials, setSocials] = useState({
        youtube: '',
        tiktok: '',
        instagram: '',
        twitter: '',
        telegram: '',
        vk: ''
    });

    useEffect(() => {
        if (user?.preferences?.timezone && user.preferences.timezone !== profile.timezone) {
            setProfile(p => ({ ...p, timezone: user.preferences.timezone }))
        }
    }, [user?.preferences?.timezone])

    // Проверяем статус платежа из URL (после редиректа от Stripe)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        if (paymentStatus === 'success') {
            showToast('✅ Оплата прошла успешно! Подписка активирована.', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancel') {
            showToast('❌ Оплата отменена.', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Загружаем цены из localStorage (синхронизация с OwnerDashboard)
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
        // Дефолтные цены
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
        // Грандфазеринг: если у пользователя активная подписка и цена изменилась
        if (userSubscription && userSubscription.planId === plan.id && userSubscription.isActive) {
            const now = new Date();
            const nextBilling = new Date(userSubscription.nextBillingDate);
            if (now < nextBilling) {
                // До конца текущего периода — старая цена
                return isYearly ? getYearlyPrice(userSubscription.lockedPrice) : userSubscription.lockedPrice;
            }
        }
        // Новая цена
        return isYearly ? getYearlyPrice(plan.price) : plan.price;
    };

    // ============ ОПЛАТА ЧЕРЕЗ STRIPE ============
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

    // ============ ОПЛАТА ЧЕРЕЗ PAYPAL ============
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

    // ============ ОПЛАТА КРИПТОЙ ЧЕРЕЗ COINBASE ============
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

    // Простой toast (если нет showToast в проекте)
    const showToast = (message, type = 'info') => {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    };

    const handleSubscribe = (plan) => {
        // Если платный план — перенаправляем на оплату
        if (plan.price > 0) {
            handleStripePayment(plan);
            return;
        }

        // Free план — активируем сразу
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
        { id: 'profile', label: 'Профиль', icon: User },
        { id: 'subscription', label: 'Подписка', icon: Diamond },
        { id: 'socials', label: 'Соцсети', icon: Link2 },
        { id: 'notifications', label: 'Уведомления', icon: Bell },
        { id: 'security', label: 'Безопасность', icon: Shield },
        { id: 'appearance', label: 'Внешний вид', icon: Palette },
    ];

    const socialPlatforms = [
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', placeholder: 'youtube.com/channel/...' },
        { id: 'tiktok', name: 'TikTok', icon: Music, color: '#00f2ea', placeholder: 'tiktok.com/@username' },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', placeholder: 'instagram.com/username' },
        { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2', placeholder: 'twitter.com/username' },
        { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088cc', placeholder: 't.me/username' },
        { id: 'vk', name: 'VK', icon: Globe, color: '#4C75A3', placeholder: 'vk.com/username' },
    ];

    const handleSave = async () => {
        if (updateUser) updateUser({ name: profile.name })
        if (updatePreferences) {
            await updatePreferences({ language: profile.language, timezone: profile.timezone })
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    const renderProfile = () => (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera size={18} className="text-[var(--success)]" /> Аватар профиля
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-3xl font-bold text-[var(--text-inverse)]"> // [P16-CONTINUE] added
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <button className="px-4 py-2 bg-[var(--success)]/20 text-[var(--success)] rounded-lg text-sm font-medium hover:bg-[var(--success)]/30 transition-colors flex items-center gap-2"> // [P16-CONTINUE] added
                            <Camera size={14} /> Загрузить фото
                        </button>
                        <p className="text-xs text-[var(--text-muted)] mt-2">JPG, PNG до 5MB</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User size={18} className="text-[var(--success)]" /> Личная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            id="settings-name"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            placeholder=" "
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors text-[var(--text)]" // [P16-CONTINUE] added
                        />
                        <label htmlFor="settings-name" className="absolute left-4 top-2.5 text-sm text-[var(--text-muted)] transition-all peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:text-[var(--primary)] peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">Имя</label> // [P16-CONTINUE] added: floating label
                    </div>
                    <div className="relative">
                        <input
                            type="email"
                            id="settings-email"
                            value={profile.email}
                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                            placeholder=" "
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors text-[var(--text)]" // [P16-CONTINUE] added
                        />
                        <label htmlFor="settings-email" className="absolute left-4 top-2.5 text-sm text-[var(--text-muted)] transition-all peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:text-[var(--primary)] peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">Email</label> // [P16-CONTINUE] added
                    </div>
                    <div className="md:col-span-2 relative">
                        <textarea
                            id="settings-bio"
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            placeholder=" "
                            rows={3}
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-none transition-colors text-[var(--text)]" // [P16-CONTINUE] added
                        />
                        <label htmlFor="settings-bio" className="absolute left-4 top-2.5 text-sm text-[var(--text-muted)] transition-all peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:text-[var(--primary)] peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">О себе</label> // [P16-CONTINUE] added
                    </div>
                    <div className="relative">
                        <select
                            id="settings-niche"
                            value={profile.niche}
                            onChange={e => setProfile({ ...profile, niche: e.target.value })}
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors text-[var(--text)] appearance-none" // [P16-CONTINUE] added
                        >
                            <option value="">Выберите нишу</option>
                            <option value="tech">Технологии</option>
                            <option value="fitness">Фитнес</option>
                            <option value="travel">Путешествия</option>
                            <option value="food">Еда</option>
                            <option value="gaming">Игры</option>
                            <option value="business">Бизнес</option>
                        </select>
                        <label htmlFor="settings-niche" className="absolute left-4 -top-2.5 text-xs text-[var(--primary)] bg-[var(--bg)] px-1 pointer-events-none">Ниша</label> // [P16-CONTINUE] added: floating label for select
                    </div>
                    <div className="relative">
                        <select
                            id="settings-language"
                            value={profile.language}
                            onChange={e => setProfile({ ...profile, language: e.target.value })}
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors text-[var(--text)] appearance-none" // [P16-CONTINUE] added
                        >
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                        <label htmlFor="settings-language" className="absolute left-4 -top-2.5 text-xs text-[var(--primary)] bg-[var(--bg)] px-1 pointer-events-none">Язык</label> // [P16-CONTINUE] added
                    </div>
                    <div className="relative">
                        <select
                            id="settings-timezone"
                            value={profile.timezone}
                            onChange={e => setProfile({ ...profile, timezone: e.target.value })}
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors text-[var(--text)] appearance-none" // [P16-CONTINUE] added
                        >
                            {['UTC', 'Europe/Moscow', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                        <label htmlFor="settings-timezone" className="absolute left-4 -top-2.5 text-xs text-[var(--primary)] bg-[var(--bg)] px-1 pointer-events-none">Часовой пояс</label> // [P16-CONTINUE] added
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                className="magnetic-btn w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-semibold rounded-xl transition-all flex items-center justify-center gap-2" // [P16-CONTINUE] added
            >
                {saved ? <><Check size={18} /> Сохранено!</> : <><Save size={18} /> Сохранить изменения</>}
            </button>
        </div>
    );

    const renderSubscription = () => (
        <div className="space-y-6">
            {/* Активная подписка */}
            {userSubscription && userSubscription.isActive && (
                <div className="glass-card p-6 rounded-[var(--radius-xl)] border-l-4 border-[var(--success)]"> // [P16-CONTINUE] added
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text)]">Текущий план</h3>
                            <p className="text-[var(--success)] font-bold text-xl mt-1">{userSubscription.planName}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} /> Следующая оплата: {formatDate(userSubscription.nextBillingDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {userSubscription.billingCycle === 'yearly' ? 'Годовой' : userSubscription.billingCycle === 'free' ? 'Бесплатно' : 'Месячный'}
                                </span>
                            </div>
                            {userSubscription.lockedPrice !== plans.find(p => p.id === userSubscription.planId)?.price && (
                                <p className="text-xs text-[var(--warning)] mt-1">
                                    💰 Грандфазеринг: вы платите старую цену ${userSubscription.lockedPrice}/мес до {formatDate(userSubscription.nextBillingDate)}
                                </p>
                            )}
                        </div>
                        <Crown size={40} className="text-[var(--success)]" />
                    </div>
                    <button
                        onClick={handleCancelSubscription}
                        className="mt-4 px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm hover:bg-[var(--danger)]/30 transition-colors" // [P16-CONTINUE] added
                    >
                        Отменить подписку
                    </button>
                </div>
            )}

            {/* Переключатель Месяц/Год */}
            <div className="flex justify-center">
                <div className="inline-flex glass rounded-full p-1"> // [P16-CONTINUE] added
                    <button
                        onClick={() => setIsYearly(false)}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`} // [P16-CONTINUE] added
                    >
                        Месяц
                    </button>
                    <button
                        onClick={() => setIsYearly(true)}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-[var(--primary)] text-[var(--text-inverse)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`} // [P16-CONTINUE] added
                    >
                        Год ×10
                    </button>
                </div>
            </div>

            {/* Тарифные планы */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => {
                    const currentPrice = getCurrentPrice(plan);
                    const subscribed = isSubscribedTo(plan.id);
                    const isGrandfathered = userSubscription && userSubscription.planId === plan.id &&
                        userSubscription.lockedPrice !== plan.price && userSubscription.isActive;

                    return (
                        <div key={plan.id} className={`relative glass-card p-5 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300 ${subscribed ? 'border-[var(--success)]' : plan.popular ? 'border-[var(--primary)]/50' : 'border-[var(--border)]'}`}> // [P16-CONTINUE] added
                            {plan.popular && !subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--primary)] text-[var(--text-inverse)] text-xs font-bold rounded-full">
                                    Популярный
                                </div>
                            )}
                            {subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--success)] text-[var(--text-inverse)] text-xs font-bold rounded-full">
                                    Активен
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${plan.color}`} />
                                <h4 className="font-bold text-lg text-[var(--text)]">{plan.name}</h4>
                            </div>
                            <div className="text-2xl font-bold my-2 text-[var(--text)]">
                                ${currentPrice}
                                <span className="text-sm text-[var(--text-muted)] font-normal">/{isYearly ? 'год' : 'мес'}</span>
                            </div>
                            {isGrandfathered && (
                                <p className="text-xs text-[var(--warning)] mb-2">
                                    Старая цена: ${userSubscription.lockedPrice}/мес → новая: ${plan.price}/мес (с {formatDate(userSubscription.nextBillingDate)})
                                </p>
                            )}
                            <ul className="space-y-2 mt-4">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Check size={14} className="text-[var(--success)]" /> {f}
                                    </li>
                                ))}
                            </ul>

                            {/* КНОПКИ ОПЛАТЫ */}
                            {plan.price > 0 && !subscribed ? (
                                <div className="space-y-2 mt-4">
                                    <button
                                        onClick={() => handleStripePayment(plan)}
                                        disabled={paymentLoading}
                                        className="magnetic-btn w-full py-2 rounded-lg font-medium transition-all bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] disabled:opacity-50 flex items-center justify-center gap-2" // [P16-CONTINUE] added
                                    >
                                        <CreditCard size={16} />
                                        {paymentLoading ? 'Загрузка...' : `Оплатить $${currentPrice}`}
                                    </button>
                                    <button
                                        onClick={() => handleCryptoPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-lg font-medium transition-all glass hover:bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center gap-2" // [P16-CONTINUE] added
                                    >
                                        <Bitcoin size={16} className="text-orange-400" />
                                        {paymentLoading ? 'Загрузка...' : 'Крипта (USDT/BTC/ETH)'}
                                    </button>
                                    <button
                                        onClick={() => handlePayPalPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-lg font-medium transition-all bg-[#003087]/80 hover:bg-[#002a6e] text-white flex items-center justify-center gap-2" // [P16-CONTINUE] added: kept PayPal brand
                                    >
                                        <Wallet size={16} />
                                        {paymentLoading ? 'Загрузка...' : 'PayPal'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => !subscribed && handleSubscribe(plan)}
                                    disabled={subscribed}
                                    className={`w-full mt-4 py-2 rounded-lg font-medium transition-all ${subscribed
                                        ? 'bg-[var(--success)]/20 text-[var(--success)] cursor-default'
                                        : plan.popular
                                            ? 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)]'
                                            : 'glass hover:bg-[var(--surface)] text-[var(--text)]'
                                        }`} // [P16-CONTINUE] added
                                >
                                    {subscribed ? 'Активен' : 'Выбрать'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* История подписок */}
            {userSubscription && (
                <div className="glass-card p-6 rounded-[var(--radius-xl)]"> // [P16-CONTINUE] added
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text)]">История подписки</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 glass rounded-lg"> // [P16-CONTINUE] added
                            <div>
                                <div className="font-medium text-[var(--text)]">{userSubscription.planName}</div>
                                <div className="text-sm text-[var(--text-muted)]">
                                    С {formatDate(userSubscription.startDate)} • {userSubscription.billingCycle === 'yearly' ? 'Годовой' : userSubscription.billingCycle === 'free' ? 'Бесплатно' : 'Месячный'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-[var(--success)]">${userSubscription.price}</div>
                                <div className={`text-xs ${userSubscription.isActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {userSubscription.isActive ? 'Активна' : 'Отменена'}
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
            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Link2 size={18} className="text-[var(--success)]" /> Подключённые соцсети
                </h3>
                <div className="space-y-3">
                    {socialPlatforms.map(platform => {
                        const Icon = platform.icon;
                        const isConnected = socials[platform.id];
                        return (
                            <div key={platform.id} className="flex items-center gap-4 p-4 glass rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all"> // [P16-CONTINUE] added
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: platform.color + '20' }}>
                                    <Icon size={24} style={{ color: platform.color }} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-[var(--text)]">{platform.name}</div>
                                    <input
                                        type="text"
                                        value={socials[platform.id]}
                                        onChange={e => setSocials({ ...socials, [platform.id]: e.target.value })}
                                        placeholder={platform.placeholder}
                                        className="w-full mt-1 px-3 py-1.5 glass rounded-lg border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none transition-colors" // [P16-CONTINUE] added
                                    />
                                </div>
                                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--text-muted)]'}`}></div> // [P16-CONTINUE] added
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={handleSave}
                    className="magnetic-btn w-full mt-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-semibold rounded-xl transition-all flex items-center justify-center gap-2" // [P16-CONTINUE] added
                >
                    {saved ? <><Check size={18} /> Сохранено!</> : <><Save size={18} /> Сохранить соцсети</>}
                </button>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="glass-card p-6 rounded-[var(--radius-xl)] space-y-4"> // [P16-CONTINUE] added
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                <Bell size={18} className="text-[var(--success)]" /> Настройки уведомлений
            </h3>
            {[
                { id: 'email', label: 'Email-уведомления', desc: 'Получать уведомления на email', icon: Mail },
                { id: 'push', label: 'Push-уведомления', desc: 'Уведомления в браузере', icon: Smartphone },
                { id: 'marketing', label: 'Маркетинговые письма', desc: 'Новости и акции', icon: Sparkles },
                { id: 'weekly', label: 'Еженедельный отчёт', desc: 'Статистика каждый понедельник', icon: Zap },
            ].map(item => {
                const Icon = item.icon;
                return (
                    <div key={item.id} className="flex items-center justify-between p-4 glass rounded-xl hover:scale-[1.01] transition-all duration-300"> // [P16-CONTINUE] added
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg glass flex items-center justify-center"> // [P16-CONTINUE] added
                                <Icon size={18} className="text-[var(--success)]" />
                            </div>
                            <div>
                                <div className="font-medium text-[var(--text)]">{item.label}</div>
                                <div className="text-sm text-[var(--text-muted)]">{item.desc}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications({ ...notifications, [item.id]: !notifications[item.id] })}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${notifications[item.id] ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`} // [P16-CONTINUE] added
                            aria-label={notifications[item.id] ? 'Выключить' : 'Включить'}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${notifications[item.id] ? 'translate-x-6' : ''}`} /> // [P16-CONTINUE] added
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
            setPasswordError('Заполните все поля');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Пароли не совпадают');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Пароль минимум 6 символов');
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
                setPasswordSuccess('Пароль успешно изменён');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPasswordError(data.message || 'Ошибка смены пароля');
            }
        } catch (err) {
            setPasswordError('Ошибка сервера');
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
            setEmailError('Заполните все поля');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
            setEmailError('Некорректный email');
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
                setEmailError('Слишком много попыток. Подождите 1 минуту.');
                return;
            }

            const data = await response.json();
            if (response.ok && data.success) {
                setEmailSuccess('Email успешно изменён');
                if (data.token) localStorage.setItem('token', data.token);
                if (data.user?.email) updateUser({ email: data.user.email });
                setEmailForm({ newEmail: '', currentPassword: '' });
                setTimeout(() => window.location.reload(), 1200);
            } else {
                setEmailError(data.message || data.error || 'Ошибка смены email');
            }
        } catch (err) {
            setEmailError('Ошибка сети. Попробуйте позже.');
        } finally {
            setEmailLoading(false);
        }
    };

    const renderSecurity = () => (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Lock size={18} className="text-[var(--success)]" /> Смена пароля
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    {passwordError && (
                        <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs"> // [P16-CONTINUE] added
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-xs"> // [P16-CONTINUE] added
                            {passwordSuccess}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Текущий пароль"
                            className="w-full pl-4 pr-12 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--text)] placeholder-[var(--text-muted)]" // [P16-CONTINUE] added
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            aria-label={showCurrentPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="Новый пароль"
                            className="w-full pl-4 pr-12 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--text)] placeholder-[var(--text-muted)]" // [P16-CONTINUE] added
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            aria-label={showNewPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="Подтвердите пароль"
                            className="w-full pl-4 pr-12 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--text)] placeholder-[var(--text-muted)]" // [P16-CONTINUE] added
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="magnetic-btn w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--text-inverse)] font-medium rounded-lg transition-all" // [P16-CONTINUE] added
                    >
                        {passwordLoading ? 'Сохранение...' : 'Обновить пароль'}
                    </button>
                </form>
            </div>

            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    <Mail size={18} className="text-[var(--success)]" /> Смена email
                </h3>
                <form onSubmit={handleEmailChange} className="space-y-3">
                    {emailError && (
                        <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs"> // [P16-CONTINUE] added
                            {emailError}
                        </div>
                    )}
                    {emailSuccess && (
                        <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-xs"> // [P16-CONTINUE] added
                            {emailSuccess}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="email"
                            id="settings-new-email"
                            value={emailForm.newEmail}
                            onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                            placeholder=" "
                            className="peer w-full px-4 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--text)] transition-colors" // [P16-CONTINUE] added
                        />
                        <label htmlFor="settings-new-email" className="absolute left-4 top-2.5 text-sm text-[var(--text-muted)] transition-all peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:text-[var(--primary)] peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">Новый email</label> // [P16-CONTINUE] added
                    </div>

                    <div className="relative">
                        <input
                            type={showEmailPassword ? 'text' : 'password'}
                            id="settings-email-password"
                            value={emailForm.currentPassword}
                            onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                            placeholder=" "
                            className="peer w-full pl-4 pr-12 py-2.5 glass rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--text)] transition-colors" // [P16-CONTINUE] added
                        />
                        <label htmlFor="settings-email-password" className="absolute left-4 top-2.5 text-sm text-[var(--text-muted)] transition-all peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:text-[var(--primary)] peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">Текущий пароль</label> // [P16-CONTINUE] added
                        <button
                            type="button"
                            onClick={() => setShowEmailPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            aria-label={showEmailPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showEmailPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={emailLoading}
                        className="magnetic-btn w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--text-inverse)] font-medium rounded-lg transition-all" // [P16-CONTINUE] added
                    >
                        {emailLoading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </form>
            </div>

            <div className="glass-card p-6 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300"> // [P16-CONTINUE] added
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg glass flex items-center justify-center"> // [P16-CONTINUE] added
                            <Shield size={18} className="text-[var(--success)]" />
                        </div>
                        <div>
                            <div className="font-medium text-[var(--text)]">Двухфакторная аутентификация</div>
                            <div className="text-sm text-[var(--text-muted)]">Дополнительная защита аккаунта</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setTwoFA(!twoFA)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${twoFA ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`} // [P16-CONTINUE] added
                        aria-label={twoFA ? 'Выключить 2FA' : 'Включить 2FA'}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${twoFA ? 'translate-x-6' : ''}`} /> // [P16-CONTINUE] added
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

    const renderAppearance = () => (
        <div className="glass-card p-6 rounded-[var(--radius-xl)] space-y-6"> // [P16-CONTINUE] added
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                <Palette size={18} className="text-[var(--success)]" /> Тема оформления
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-[var(--primary)] glass' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`} // [P16-CONTINUE] added
                >
                    <Moon size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                    <div className="font-medium text-[var(--text)]">Тёмная</div>
                    <div className="text-sm text-[var(--text-muted)]">Классический тёмный режим</div>
                </button>
                <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-6 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-[var(--primary)] glass' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`} // [P16-CONTINUE] added
                >
                    <Sun size={32} className="mx-auto mb-3 text-yellow-400" />
                    <div className="font-medium text-[var(--text)]">Светлая</div>
                    <div className="text-sm text-[var(--text-muted)]">Светлый режим для дневного времени</div>
                </button>
            </div>

            <div className="border-t border-[var(--border)] pt-6"> // [P16-CONTINUE] added
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text)]">
                    {soundEnabled ? <Volume2 size={18} className="text-[var(--success)]" /> : <VolumeX size={18} className="text-[var(--text-muted)]" />}
                    Звуковое сопровождение
                </h3>
                <div className="flex items-center justify-between p-4 glass rounded-xl hover:scale-[1.01] transition-all duration-300"> // [P16-CONTINUE] added
                    <div>
                        <div className="font-medium text-[var(--text)]">Звуки OMEGA</div>
                        <div className="text-sm text-[var(--text-muted)]">Активация, уведомления, сообщения</div>
                    </div>
                    <button
                        onClick={handleSoundToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`} // [P16-CONTINUE] added
                        aria-label={soundEnabled ? 'Выключить звуки' : 'Включить звуки'}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--text-inverse)] shadow-md transition-all duration-300 ${soundEnabled ? 'translate-x-6' : ''}`} /> // [P16-CONTINUE] added
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
            default: return renderProfile();
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6"> // [P16-CONTINUE] added
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center"> // [P16-CONTINUE] added
                        <Palette size={20} className="text-[var(--text-inverse)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">Настройки</h1>
                        <p className="text-[var(--text-muted)] text-sm">Управляй профилем, подпиской и интеграциями</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="glass-card rounded-[var(--radius-xl)] overflow-hidden"> // [P16-CONTINUE] added
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-[var(--surface)] ${activeTab === tab.id ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-[3px] border-[var(--primary)]' : 'text-[var(--text-muted)] border-l-[3px] border-transparent'}`} // [P16-CONTINUE] added
                                >
                                    <Icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                    {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                                </button>
                            );
                        })}
                        <div className="border-t border-[var(--border)] mt-2 pt-2"> // [P16-CONTINUE] added
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all" // [P16-CONTINUE] added
                            >
                                <LogOut size={18} /> Выйти
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;