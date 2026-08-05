import React from 'react'
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

// [v6.4] Force the service worker to check for updates immediately on load and reload on update
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
        reg.update()
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            newWorker?.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    window.location.reload()
                }
            })
        })
    })
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