import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Rollbar from 'rollbar'
import { AuthProvider } from './context/AuthContext'
import { AdProvider } from './context/AdContext'
import App from './App'
import './index.css'

Rollbar.init({
    accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN || process.env.VITE_ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
        environment: import.meta.env.MODE || 'production',
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <AdProvider>
                    <App />
                </AdProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)