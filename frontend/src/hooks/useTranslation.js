import { useState, useEffect } from 'react'
import { getTranslation, detectLanguage } from '../i18n/index.js'

export const useTranslation = () => {
  const [lang, setLang] = useState(detectLanguage)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang)
      localStorage.setItem('i18n-lang', lang)
    }
  }, [lang])

  const t = (key, params) => getTranslation(lang, key, params)

  return { t, lang, setLang }
}

export default useTranslation
