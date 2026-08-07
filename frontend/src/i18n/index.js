import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('i18n-lang') : null

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: savedLang || undefined,
    fallbackLng: 'ru',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: [],
    },
    interpolation: {
      escapeValue: true,
    },
  })

export function setLanguage(lang) {
  i18n.changeLanguage(lang)
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18n-lang', lang)
  }
}

export function getTranslation(lang, key) {
  const bundle = i18n.getResourceBundle(lang, 'translation') || {}
  const parts = key.split('.')
  let value = bundle
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) return key
  }
  return typeof value === 'string' ? value : key
}

export function detectLanguage() {
  if (typeof window === 'undefined') return 'ru'
  const saved = localStorage.getItem('lang') || localStorage.getItem('i18n-lang')
  if (saved && ['ru', 'en'].includes(saved)) return saved
  const browser = navigator.language?.slice(0, 2)
  if (browser && ['ru', 'en'].includes(browser)) return browser
  return 'ru'
}

export default i18n
