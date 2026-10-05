import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Installeerbare app (PWA): werkt offline en krijgt een eigen venster + icoon.
const pwa = VitePWA({
  // Zelf registreren (src/lib/pwaUpdate.ts): update direct toepassen, maar niet midden in typen/slepen.
  registerType: 'autoUpdate',
  injectRegister: false,
  includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
  manifest: {
    name: "Ilan's To-Do lijst",
    short_name: 'To-Do',
    description: 'Cozy to-do lijst met taken als trading cards.',
    lang: 'nl',
    // Relatief, zodat de app ook in een submap werkt (GitHub Pages: /ilans-todo-lijst/).
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#221d1b',
    theme_color: '#221d1b',
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // Nieuwe versie meteen actief; src/lib/pwaUpdate.ts herlaadt de pagina op een veilig moment.
    skipWaiting: true,
    clientsClaim: true,
    navigateFallback: 'index.html',
    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    runtimeCaching: [
      {
        // Lettertypes ook offline beschikbaar
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

// `npm run build:single` maakt één losstaand HTML-bestand (handig om te delen/testen).
export default defineConfig(({ mode }) => ({
  // GitHub Pages zet BASE_PATH (bijv. /ilans-todo-lijst/); lokaal draait alles op /.
  base: process.env.BASE_PATH ?? '/',
  // Versie = bouwtijdstip; zichtbaar als <html data-build> om te checken welke versie een apparaat draait.
  define: { __BUILD__: JSON.stringify(new Date().toISOString()) },
  // De losse HTML heeft geen service worker: vervang de PWA-registratie door een lege stub.
  resolve: mode === 'single' ? { alias: { 'virtual:pwa-register': '/src/lib/pwaStub.ts' } } : {},
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [pwa])],
  build: mode === 'single' ? { outDir: 'dist-single' } : {},
}))
