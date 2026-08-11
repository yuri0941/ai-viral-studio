import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { request } from '../services/api.js'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function VkCallbackPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('processing') // processing | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const deviceId = searchParams.get('device_id')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      setStatus('error')
      setMessage(t('vk.authError', { reason: errorDescription || error }))
      return
    }

    if (!code || !state) {
      setStatus('error')
      setMessage(t('vk.authMissingParams'))
      return
    }

    request('/vk/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state, device_id: deviceId })
    })
      .then(data => {
        if (data?.success) {
          setStatus('success')
          setMessage(t('vk.authSuccess'))
        } else {
          setStatus('error')
          setMessage(data?.message || data?.reason || t('vk.authFailed'))
        }
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.message || t('vk.authFailed'))
      })
  }, [searchParams, t])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-md p-6 rounded-2xl glass-luxury border border-[var(--border)] text-center space-y-4">
        <h1 className="text-xl font-bold text-[var(--text)]">{t('vk.callbackTitle')}</h1>
        {status === 'processing' && (
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <p>{t('vk.processing')}</p>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <p className="text-emerald-400">{message}</p>
            <Link to="/settings" className="mt-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-inverse)] text-sm font-medium">
              {t('vk.goToSettings')}
            </Link>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-400">{message}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('vk.authHint')}</p>
            <Link to="/settings" className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-[var(--text)] text-sm font-medium hover:bg-white/15">
              {t('vk.goToSettings')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
