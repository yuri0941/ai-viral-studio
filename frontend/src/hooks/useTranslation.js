import { useState, useEffect, useCallback } from 'react'
import { getTranslation, detectLanguage } from '../i18n/index.js'

export const useTranslation = () => {
  const [lang, setLang] = useState(detectLanguage)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang)
      localStorage.setItem('i18n-lang', lang)
    }
  }, [lang])

  // [PERF-AUDIT П3] стабильная ссылка на t между рендерами (меняется только со сменой языка) —
  // иначе React.memo на тяжёлых потомках (AiMessageContent и др.) никогда не срабатывал:
  // каждый keystroke в инпуте чата перерендеривал всю ленту с markdown-парсингом.
  const t = useCallback((key, params) => getTranslation(lang, key, params), [lang])

  return { t, lang, setLang }
}

export default useTranslation
