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

export function getTranslation(lang, key, params) {
  const bundle = i18n.getResourceBundle(lang, 'translation') || {}
  // Flat keys ("chat.placeholder") take priority — the locale files mix
  // dotted flat keys with nested objects, and a nested object with the same
  // first segment must not shadow them.
  let value = typeof bundle[key] === 'string' ? bundle[key] : undefined
  if (value === undefined) {
    const parts = key.split('.')
    let node = bundle
    for (const part of parts) {
      node = node?.[part]
      if (node === undefined) break
    }
    value = typeof node === 'string' ? node : undefined
  }
  if (value === undefined) return key
  if (params && typeof params === 'object') {
    for (const [name, paramValue] of Object.entries(params)) {
      value = value.replaceAll(`{{${name}}}`, String(paramValue))
    }
  }
  return value
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
