import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useTranslation } from '../../hooks/useTranslation.js'

// [CHAT-UNIFY ДОП-2а] тур ведёт в единый вход «OMEGA» и подсвечивает переключатели режимов
// внутри него; ссылки на удалённые пункты меню (AI Chat / Viral Chat / Анализ контента) убраны.
// i18n: все строки через tour.*; {{current}}/{{total}} оставляет driver.js (i18next их не трогает —
// переменные не передаются).
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

function drive(t, onFinish) {
    const d = driver({
        showProgress: true,
        progressText: t('tour.progress'),
        nextBtnText: t('tour.next'),
        prevBtnText: t('tour.prev'),
        doneBtnText: t('tour.done'),
        steps: buildSteps(t),
        onDestroyed: () => {
            localStorage.setItem('omega_onboarding_tour_done', 'true')
            onFinish?.()
        },
    })
    d.drive()
}

export default function OnboardingTour({ onFinish }) {
    const { t } = useTranslation()
    const startTour = useCallback(() => {
        if (typeof window === 'undefined') return
        drive(t, onFinish)
    }, [t, onFinish])

    useEffect(() => {
        const done = localStorage.getItem('omega_onboarding_tour_done')
        if (!done) {
            const timer = setTimeout(startTour, 1200)
            return () => clearTimeout(timer)
        }
    }, [startTour])

    return null
}
