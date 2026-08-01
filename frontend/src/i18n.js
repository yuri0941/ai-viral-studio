import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from './locales/ru.json'
import en from './locales/en.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: ru },
            en: { translation: en },
        },
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'app_language',
        },
    })

export const setLanguage = (lng) => {
    if (['ru', 'en'].includes(lng)) {
        i18n.changeLanguage(lng)
    }
}

export default i18n
