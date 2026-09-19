import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// IMPORTANT — GitHub Pages base path:
// - Si publicas en usuario.github.io/NOMBRE-DEL-REPO  -> base: '/NOMBRE-DEL-REPO/'
// - Si publicas en un dominio propio o en usuario.github.io (repo raíz) -> base: '/'
// Se puede fijar sin tocar el código con la variable de entorno BASE_PATH,
// que ya está configurada en .github/workflows/deploy.yml
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Campus Toolkit — Suite de estudiante',
        short_name: 'Campus Toolkit',
        description: 'Conversión de archivos, transcripción en vivo y herramientas de productividad para estudiantes universitarios.',
        theme_color: '#14213D',
        background_color: '#F3F5F7',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Todo lo que no sea un asset propio (APIs externas, Workers) nunca se cachea
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
});
