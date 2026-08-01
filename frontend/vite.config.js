import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            injectManifest: {
                injectionPoint: 'self.__WB_MANIFEST',
            },
            manifest: {
                name: 'AI Viral Studio',
                short_name: 'ViralStudio',
                description: 'AI-powered content creation and analytics platform',
                theme_color: '#8b5cf6',
                background_color: '#0f0f1a',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ],
                screenshots: [
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'AI Viral Studio Dashboard'
                    }
                ],
                shortcuts: [
                    {
                        name: 'AI Chat',
                        short_name: 'Chat',
                        description: 'Open OMEGA AI chat',
                        url: '/ai-chat',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
                    }
                ]
            }
        })
    ],
    resolve: {
        extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    ui: ['lucide-react', 'recharts'],
                    omega: ['@tanstack/react-query'],
                },
            },
        },
    },
})