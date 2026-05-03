import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'logo-1024.png'],
      manifest: {
        name: 'MSAD CNC — نظام الإدارة',
        short_name: 'MSAD CNC',
        description: 'نظام إدارة الأعمال — مبيعات، مشتريات، موظفين، عملاء، موردين',
        theme_color: '#1d4ed8',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        shortcuts: [
          { name: 'المبيعات', url: '/sales', description: 'إضافة فاتورة بيع جديدة' },
          { name: 'المشتريات', url: '/purchases', description: 'إضافة فاتورة شراء جديدة' },
          { name: 'العملاء', url: '/customers', description: 'إدارة العملاء' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-apps-script',
              expiration: { maxEntries: 30, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
