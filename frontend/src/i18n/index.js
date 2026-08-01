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

export default i18n
