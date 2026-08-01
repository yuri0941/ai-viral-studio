import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import {
    User, Diamond, Link2, Bell, Shield, Palette, LogOut,
    Camera, Save, Check, Youtube, Music, Instagram, Twitter,
    Send, Globe, Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff,
    ChevronRight, Sparkles, Crown, Zap, Users, Calendar, CreditCard,
    Wallet, Bitcoin
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
            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera size={18} className="text-emerald-400" /> Аватар профиля
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-bold">
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <button className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors flex items-center gap-2">
                            <Camera size={14} /> Загрузить фото
                        </button>
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG до 5MB</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User size={18} className="text-emerald-400" /> Личная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Имя</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none transition-colors"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm text-gray-400 mb-1 block">О себе</label>
                        <textarea
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Расскажи о себе и своём контенте..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none resize-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ниша</label>
                        <select
                            value={profile.niche}
                            onChange={e => setProfile({ ...profile, niche: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none transition-colors"
                        >
                            <option value="">Выберите нишу</option>
                            <option value="tech">Технологии</option>
                            <option value="fitness">Фитнес</option>
                            <option value="travel">Путешествия</option>
                            <option value="food">Еда</option>
                            <option value="gaming">Игры</option>
                            <option value="business">Бизнес</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Язык</label>
                        <select
                            value={profile.language}
                            onChange={e => setProfile({ ...profile, language: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none transition-colors"
                        >
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Часовой пояс</label>
                        <select
                            value={profile.timezone}
                            onChange={e => setProfile({ ...profile, timezone: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none transition-colors"
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
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
                {saved ? <><Check size={18} /> Сохранено!</> : <><Save size={18} /> Сохранить изменения</>}
            </button>
        </div>
    );

    const renderSubscription = () => (
        <div className="space-y-6">
            {/* Активная подписка */}
            {userSubscription && userSubscription.isActive && (
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-6 border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Текущий план</h3>
                            <p className="text-emerald-400 font-bold text-xl mt-1">{userSubscription.planName}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} /> Следующая оплата: {formatDate(userSubscription.nextBillingDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {userSubscription.billingCycle === 'yearly' ? 'Годовой' : userSubscription.billingCycle === 'free' ? 'Бесплатно' : 'Месячный'}
                                </span>
                            </div>
                            {userSubscription.lockedPrice !== plans.find(p => p.id === userSubscription.planId)?.price && (
                                <p className="text-xs text-amber-400 mt-1">
                                    💰 Грандфазеринг: вы платите старую цену ${userSubscription.lockedPrice}/мес до {formatDate(userSubscription.nextBillingDate)}
                                </p>
                            )}
                        </div>
                        <Crown size={40} className="text-emerald-400" />
                    </div>
                    <button
                        onClick={handleCancelSubscription}
                        className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                        Отменить подписку
                    </button>
                </div>
            )}

            {/* Переключатель Месяц/Год */}
            <div className="flex justify-center">
                <div className="inline-flex bg-[#1a1a24] rounded-xl p-1 border border-white/5">
                    <button
                        onClick={() => setIsYearly(false)}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${!isYearly ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Месяц
                    </button>
                    <button
                        onClick={() => setIsYearly(true)}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${isYearly ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
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
                        <div key={plan.id} className={`relative bg-[#1a1a24] rounded-xl p-5 border ${subscribed ? 'border-emerald-500' : plan.popular ? 'border-emerald-500/50' : 'border-white/5'} hover:border-emerald-500/30 transition-all`}>
                            {plan.popular && !subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full">
                                    Популярный
                                </div>
                            )}
                            {subscribed && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full">
                                    Активен
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${plan.color}`} />
                                <h4 className="font-bold text-lg">{plan.name}</h4>
                            </div>
                            <div className="text-2xl font-bold my-2">
                                ${currentPrice}
                                <span className="text-sm text-gray-400 font-normal">/{isYearly ? 'год' : 'мес'}</span>
                            </div>
                            {isGrandfathered && (
                                <p className="text-xs text-amber-400 mb-2">
                                    Старая цена: ${userSubscription.lockedPrice}/мес → новая: ${plan.price}/мес (с {formatDate(userSubscription.nextBillingDate)})
                                </p>
                            )}
                            <ul className="space-y-2 mt-4">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                        <Check size={14} className="text-emerald-400" /> {f}
                                    </li>
                                ))}
                            </ul>

                            {/* КНОПКИ ОПЛАТЫ */}
                            {plan.price > 0 && !subscribed ? (
                                <div className="space-y-2 mt-4">
                                    <button
                                        onClick={() => handleStripePayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-lg font-medium transition-all bg-emerald-500 hover:bg-emerald-600 text-black disabled:bg-gray-600 flex items-center justify-center gap-2"
                                    >
                                        <CreditCard size={16} />
                                        {paymentLoading ? 'Загрузка...' : `Оплатить $${currentPrice}`}
                                    </button>
                                    <button
                                        onClick={() => handleCryptoPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-lg font-medium transition-all bg-[#252530] hover:bg-[#303040] text-white border border-white/10 flex items-center justify-center gap-2"
                                    >
                                        <Bitcoin size={16} className="text-orange-400" />
                                        {paymentLoading ? 'Загрузка...' : 'Крипта (USDT/BTC/ETH)'}
                                    </button>
                                    <button
                                        onClick={() => handlePayPalPayment(plan)}
                                        disabled={paymentLoading}
                                        className="w-full py-2 rounded-lg font-medium transition-all bg-[#003087] hover:bg-[#002a6e] text-white flex items-center justify-center gap-2"
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
                                        ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                        : plan.popular
                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                                            : 'bg-[#252530] hover:bg-[#303040] text-white'
                                        }`}
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
                <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold mb-4">История подписки</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-[#252530] rounded-lg">
                            <div>
                                <div className="font-medium">{userSubscription.planName}</div>
                                <div className="text-sm text-gray-400">
                                    С {formatDate(userSubscription.startDate)} • {userSubscription.billingCycle === 'yearly' ? 'Годовой' : userSubscription.billingCycle === 'free' ? 'Бесплатно' : 'Месячный'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-emerald-400">${userSubscription.price}</div>
                                <div className={`text-xs ${userSubscription.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Link2 size={18} className="text-emerald-400" /> Подключённые соцсети
                </h3>
                <div className="space-y-3">
                    {socialPlatforms.map(platform => {
                        const Icon = platform.icon;
                        const isConnected = socials[platform.id];
                        return (
                            <div key={platform.id} className="flex items-center gap-4 p-4 bg-[#252530] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: platform.color + '20' }}>
                                    <Icon size={24} style={{ color: platform.color }} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{platform.name}</div>
                                    <input
                                        type="text"
                                        value={socials[platform.id]}
                                        onChange={e => setSocials({ ...socials, [platform.id]: e.target.value })}
                                        placeholder={platform.placeholder}
                                        className="w-full mt-1 px-3 py-1.5 bg-[#1a1a24] rounded-lg border border-white/10 text-sm focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-600'}`}></div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={handleSave}
                    className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {saved ? <><Check size={18} /> Сохранено!</> : <><Save size={18} /> Сохранить соцсети</>}
                </button>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5 space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell size={18} className="text-emerald-400" /> Настройки уведомлений
            </h3>
            {[
                { id: 'email', label: 'Email-уведомления', desc: 'Получать уведомления на email', icon: Mail },
                { id: 'push', label: 'Push-уведомления', desc: 'Уведомления в браузере', icon: Smartphone },
                { id: 'marketing', label: 'Маркетинговые письма', desc: 'Новости и акции', icon: Sparkles },
                { id: 'weekly', label: 'Еженедельный отчёт', desc: 'Статистика каждый понедельник', icon: Zap },
            ].map(item => {
                const Icon = item.icon;
                return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-[#252530] rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#1a1a24] flex items-center justify-center">
                                <Icon size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <div className="font-medium">{item.label}</div>
                                <div className="text-sm text-gray-400">{item.desc}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications({ ...notifications, [item.id]: !notifications[item.id] })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${notifications[item.id] ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${notifications[item.id] ? 'left-6' : 'left-0.5'}`}></div>
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
            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-emerald-400" /> Смена пароля
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    {passwordError && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            {passwordSuccess}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Текущий пароль"
                            className="w-full pl-4 pr-12 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-white placeholder-gray-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
                            className="w-full pl-4 pr-12 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-white placeholder-gray-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
                            className="w-full pl-4 pr-12 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-white placeholder-gray-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-medium rounded-lg transition-all"
                    >
                        {passwordLoading ? 'Сохранение...' : 'Обновить пароль'}
                    </button>
                </form>
            </div>

            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Mail size={18} className="text-emerald-400" /> Смена email
                </h3>
                <form onSubmit={handleEmailChange} className="space-y-3">
                    {emailError && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            {emailError}
                        </div>
                    )}
                    {emailSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            {emailSuccess}
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Новый email</label>
                        <input
                            type="email"
                            value={emailForm.newEmail}
                            onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                            placeholder="new@example.com"
                            className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-white placeholder-gray-500"
                        />
                    </div>

                    <div className="relative">
                        <label className="text-sm text-gray-400 mb-1 block">Текущий пароль</label>
                        <input
                            type={showEmailPassword ? 'text' : 'password'}
                            value={emailForm.currentPassword}
                            onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                            placeholder="Текущий пароль"
                            className="w-full pl-4 pr-12 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-white placeholder-gray-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowEmailPassword(v => !v)}
                            className="absolute right-2 top-[30px] w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            aria-label={showEmailPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showEmailPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={emailLoading}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-medium rounded-lg transition-all"
                    >
                        {emailLoading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </form>
            </div>

            <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#252530] flex items-center justify-center">
                            <Shield size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <div className="font-medium">Двухфакторная аутентификация</div>
                            <div className="text-sm text-gray-400">Дополнительная защита аккаунта</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setTwoFA(!twoFA)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${twoFA ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${twoFA ? 'left-6' : 'left-0.5'}`}></div>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAppearance = () => (
        <div className="bg-[#1a1a24] rounded-xl p-6 border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette size={18} className="text-emerald-400" /> Тема оформления
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-emerald-500 bg-[#252530]' : 'border-white/10 hover:border-white/20'}`}
                >
                    <Moon size={32} className="mx-auto mb-3 text-gray-300" />
                    <div className="font-medium">Тёмная</div>
                    <div className="text-sm text-gray-400">Классический тёмный режим</div>
                </button>
                <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-6 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-emerald-500 bg-[#252530]' : 'border-white/10 hover:border-white/20'}`}
                >
                    <Sun size={32} className="mx-auto mb-3 text-yellow-400" />
                    <div className="font-medium">Светлая</div>
                    <div className="text-sm text-gray-400">Светлый режим для дневного времени</div>
                </button>
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
        <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Palette size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Настройки</h1>
                        <p className="text-gray-400 text-sm">Управляй профилем, подпиской и интеграциями</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-[#1a1a24] rounded-xl border border-white/5 overflow-hidden">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-[#252530] ${activeTab === tab.id ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' : 'text-gray-300 border-l-2 border-transparent'}`}
                                >
                                    <Icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                    {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                                </button>
                            );
                        })}
                        <div className="border-t border-white/5 mt-2 pt-2">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-all"
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