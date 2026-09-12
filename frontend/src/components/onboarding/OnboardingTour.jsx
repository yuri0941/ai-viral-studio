import { useEffect, useCallback, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useTranslation } from '../../hooks/useTranslation.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { API_URL } from '../../config.js'

// [CHAT-UNIFY ДОП-2а] тур ведёт в единый вход «OMEGA» и подсвечивает переключатели режимов
// внутри него; ссылки на удалённые пункты меню (AI Chat / Viral Chat / Анализ контента) убраны.
// i18n: все строки через tour.*; {{current}}/{{total}} оставляет driver.js (i18next их не трогает —
// переменные не передаются).
// [ONBOARDING-EMPTY-STATE] «Пропустить» виден на каждом шаге; флаг завершения хранится
// и в localStorage, и в профиле на сервере (preferences.onboarding.tourDone) — тур не всплывёт
// на другом устройстве/после смены браузера.
const TOUR_DONE_KEY = 'omega_onboarding_tour_done'

function buildSteps(t) {
    const visible = (selector) => [...document.querySelectorAll(selector)].find(el => el.offsetParent !== null)
    return [
        {
            popover: {
                title: t('tour.stepWelcome.title'),
                description: t('tour.stepWelcome.description'),
            },
        },
        {
            element: () => visible('[data-tour="hub-modes"]'),
            popover: {
                title: t('tour.stepModes.title'),
                description: t('tour.stepModes.description'),
                side: 'right',
                align: 'start',
            },
        },
        {
            element: '[data-tour="omega-input"]',
            popover: {
                title: t('tour.stepInput.title'),
                description: t('tour.stepInput.description'),
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '[data-tour="quick-actions"]',
            popover: {
                title: t('tour.stepActions.title'),
                description: t('tour.stepActions.description'),
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '[data-tour="voice-input"]',
            popover: {
                title: t('tour.stepVoice.title'),
                description: t('tour.stepVoice.description'),
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '[data-tour="token-counter"]',
            popover: {
                title: t('tour.stepTokens.title'),
                description: t('tour.stepTokens.description'),
                side: 'left',
                align: 'start',
            },
        },
    ]
}

// [QA-FIX] driver.js 1.8.0: destroy() в окне entry-анимации (400ms, rAF) молча НЕ вызывает
// onDestroyed (внутри проверка __activeElement/__activeStep — ставятся только после transition).
// На медленном CI скип попадал в это окно → markTourDone не бежал → тур всплывал после reload
// и на «втором устройстве». Поэтому флаг ставим ДО destroy во всех путях закрытия
// (skip/overlay/Esc/done), один раз за загрузку страницы; onDestroyed — страховка.
// keepalive: PATCH не отменяется навигацией сразу после скипа.
let tourMarkedDone = false

function markTourDone() {
    if (tourMarkedDone) return
    tourMarkedDone = true
    localStorage.setItem(TOUR_DONE_KEY, 'true')
    const token = localStorage.getItem('token')
    fetch(`${API_URL}/users/me/onboarding`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tourDone: true }),
        keepalive: true,
    }).catch(err => console.warn('[OnboardingTour] server sync failed:', err))
}

function drive(t, onFinish) {
    const d = driver({
        showProgress: true,
        progressText: t('tour.progress'),
        nextBtnText: t('tour.next'),
        prevBtnText: t('tour.prev'),
        doneBtnText: t('tour.done'),
        steps: buildSteps(t),
        onPopoverRender: (popover) => {
            // «Пропустить» доступен с первого шага, а не только в конце тура
            if (popover.footerButtons.querySelector('.omega-tour-skip')) return
            const skip = document.createElement('button')
            skip.type = 'button'
            skip.className = 'omega-tour-skip'
            skip.textContent = t('tour.skip')
            skip.style.cssText = 'margin-right:auto;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:13px;text-decoration:underline;padding:4px 0;'
            skip.addEventListener('click', () => { markTourDone(); d.destroy() })
            popover.footerButtons.prepend(skip)
        },
        // [QA-FIX] overlay/Esc/done идут через h(true) → onDestroyStarted: ставим флаг ДО destroy,
        // т.к. при destroy в окне анимации onDestroyed молча теряется
        onDestroyStarted: () => {
            markTourDone()
            d.destroy()
        },
        onDestroyed: () => {
            markTourDone()
            onFinish?.()
        },
    })
    d.drive()
}

export default function OnboardingTour({ onFinish }) {
    const { t } = useTranslation()
    const { user } = useAuth()
    const started = useRef(false)

    const startTour = useCallback(() => {
        if (typeof window === 'undefined') return
        drive(t, onFinish)
    }, [t, onFinish])

    useEffect(() => {
        if (started.current) return
        if (!user) return // ждём профиль: серверный флаг важнее пустого localStorage
        const serverDone = user?.preferences?.onboarding?.tourDone === true
        if (serverDone) {
            localStorage.setItem(TOUR_DONE_KEY, 'true')
            started.current = true
            return
        }
        if (localStorage.getItem(TOUR_DONE_KEY)) {
            started.current = true
            return
        }
        // флаг ставим в момент запуска, а не в момент установки таймера —
        // иначе ререндер (deps: t — новая ссылка каждый рендер) гасил таймер навсегда
        const timer = setTimeout(() => {
            if (started.current) return
            started.current = true
            startTour()
        }, 1200)
        return () => clearTimeout(timer)
    }, [startTour, user])

    return null
}
