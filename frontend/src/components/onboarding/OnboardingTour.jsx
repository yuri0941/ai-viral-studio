import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const STEPS = [
  {
    element: '[data-tour="omega-input"]',
    popover: {
      title: 'Задайте тему',
      description: 'Напишите любую идею — OMEGA поможет развить её.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: 'Быстрые действия',
      description: 'Генерация хуков, сценариев, обложек — в 1 клик.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-input"]',
    popover: {
      title: 'Голосовой ввод',
      description: 'Нажмите и говорите — OMEGA поймёт.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="token-counter"]',
    popover: {
      title: 'Токены генераций',
      description: 'Справка и навигация бесплатны. Сложные задачи расходуют токены.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="support-widget"]',
    popover: {
      title: 'Поддержка',
      description: 'Есть вопрос? Мы рядом 💬',
      side: 'left',
      align: 'start',
    },
  },
]

export default function OnboardingTour({ onFinish }) {
  const startTour = useCallback(() => {
    if (typeof window === 'undefined') return
    const d = driver({
      showProgress: true,
      progressText: 'Шаг {{current}} из {{total}}',
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      doneBtnText: 'Готово',
      steps: STEPS,
      onDestroyed: () => {
        localStorage.setItem('omega_onboarding_tour_done', 'true')
        onFinish?.()
      },
    })
    d.drive()
  }, [onFinish])

  useEffect(() => {
    const done = localStorage.getItem('omega_onboarding_tour_done')
    if (!done) {
      const timer = setTimeout(startTour, 1200)
      return () => clearTimeout(timer)
    }
  }, [startTour])

  return null
}

export function startOnboardingTourManually() {
  const d = driver({
    showProgress: true,
    progressText: 'Шаг {{current}} из {{total}}',
    nextBtnText: 'Далее',
    prevBtnText: 'Назад',
    doneBtnText: 'Готово',
    steps: STEPS,
    onDestroyed: () => {
      localStorage.setItem('omega_onboarding_tour_done', 'true')
    },
  })
  d.drive()
}
