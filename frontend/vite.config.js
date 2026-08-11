import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { createRequire } from 'module'

// [v9.9.19.14] 6.5 единый источник правды версии сборки: package.json + дата билда.
// index.html использует %APP_BUILD% — никакого хардкода 'v7.0-2026-08-07'.
const require = createRequire(import.meta.url)
const pkg = require('./package.json')
const APP_BUILD = `v${pkg.version}-${new Date().toISOString().slice(0, 10)}`

export default defineConfig(({ mode }) => ({
    base: '/',
    plugins: [
        {
            name: 'app-build-version',
            transformIndexHtml(html) {
                return html.replaceAll('%APP_BUILD%', APP_BUILD)
            },
        },
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            injectManifest: {
                injectionPoint: 'self.__WB_MANIFEST',
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
                    },
                    {
                        name: 'Новый пост',
                        short_name: 'Пост',
                        description: 'Создать новый пост с OMEGA',
                        url: '/ai-chat',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Статистика',
                        short_name: 'Статистика',
                        description: 'Открыть аналитику',
                        url: '/analytics',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
                    }
                ]
            }
        }),
        mode === 'analyze' && visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
            filename: 'stats.html',
        }),
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
        emptyOutDir: true,
        sourcemap: true,
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    ui: ['lucide-react', 'recharts', 'framer-motion'],
                    ai: ['@tanstack/react-query'],
                    omega: ['./src/ai/omega'],
                },
                entryFileNames: 'assets/[name]-[hash]-v655f.js',
                chunkFileNames: 'assets/[name]-[hash]-v655f.js',
                assetFileNames: 'assets/[name]-[hash]-v655f.[ext]',
            },
        },
    },
}))
