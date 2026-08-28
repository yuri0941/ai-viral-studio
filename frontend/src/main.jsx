import React from 'react'

const __BUILD_TIMESTAMP__ = '20260806182933';
console.log('[BUILD]', __BUILD_TIMESTAMP__);

// BUILD_TIMESTAMP: 20260806154723
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Rollbar from 'rollbar'
import { AuthProvider } from './context/AuthContext'
import { AdProvider } from './context/AdContext'
import App from './App'
import ErrorBoundary from './components/shared/ErrorBoundary'
import './i18n'
import './index.css'
import './styles/globals.css'
import './styles/luxury.css'
import './styles/animations.css'
import { initOfflineSync } from './services/offlineSync.js'

initOfflineSync()

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            cacheTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

try {
    Rollbar.init({
        accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN || process.env.VITE_ROLLBAR_ACCESS_TOKEN,
        captureUncaught: true,
        captureUnhandledRejections: true,
        payload: {
            environment: import.meta.env.MODE || 'production',
        },
    })
} catch (err) {
    console.warn('[Rollbar] init failed:', err) // [P16-FIX] guard Rollbar init
}

// [security-hardening Б5-З6] Sentry frontend: без VITE_SENTRY_DSN — молча off; PII/секреты фильтруем
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
    import('@sentry/react').then((Sentry) => {
        Sentry.init({
            dsn: sentryDsn,
            environment: import.meta.env.MODE || 'production',
            sendDefaultPii: false,
            beforeSend(event) {
                if (event.request) {
                    delete event.request.cookies
                    if (event.request.headers) {
                        for (const h of Object.keys(event.request.headers)) {
                            if (/authorization|cookie|token|secret|key/i.test(h)) event.request.headers[h] = '[Filtered]'
                        }
                    }
                }
                if (event.user) event.user = { id: event.user.id }
                return event
            },
        })
        console.log('[Sentry] frontend инициализирован')
    }).catch((err) => console.warn('[Sentry] frontend init failed, продолжаем без него:', err))
}

// [v6.4-kill-cache] Aggressively unregister old service workers and wipe caches on startup
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
  if (window.caches) caches.keys().then(n => n.forEach(c => caches.delete(c)));
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <AdProvider>
                        <ErrorBoundary>
                            <App />
                        </ErrorBoundary>
                    </AdProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
)
