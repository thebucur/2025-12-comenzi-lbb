import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

// Plugin to generate admin manifest
function generateAdminManifest(): Plugin {
  return {
    name: 'generate-admin-manifest',
    writeBundle() {
      const adminManifest = {
        id: '/admin',
        name: 'Admin LBB',
        short_name: 'Admin LBB',
        description: 'Panou de administrare LBB',
        theme_color: '#6366f1',
        background_color: '#6366f1',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/admin',
        start_url: '/admin',
        icons: [
          {
            src: 'admin-pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'admin-pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'admin-pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
      
      const distPath = join(process.cwd(), 'dist')
      const manifestPath = join(distPath, 'admin-manifest.webmanifest')
      writeFileSync(manifestPath, JSON.stringify(adminManifest, null, 2))
    }
  }
}

// Plugin to serve admin.html at /admin in dev mode
function adminRoutePlugin(): Plugin {
  return {
    name: 'admin-route-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/admin.html'
        }
        next()
      })
    }
  }
}

// Plugin to remove main app service worker registration from admin.html
function removeMainSWFromAdmin(): Plugin {
  return {
    name: 'remove-main-sw-from-admin',
    enforce: 'post', // Run after other plugins
    closeBundle() {
      // This runs after all plugins have finished, including vite-plugin-pwa
      const adminHtmlPath = join(process.cwd(), 'dist', 'admin.html')
      try {
        let html = readFileSync(adminHtmlPath, 'utf-8')
        // Remove the main app's service worker registration script
        html = html.replace(/<script[^>]*id="vite-plugin-pwa:register-sw"[^>]*><\/script>/gi, '')
        html = html.replace(/<script[^>]*src="[^"]*registerSW\.js"[^>]*><\/script>/gi, '')
        // Remove main app manifest link if present (but keep admin manifest)
        html = html.replace(/<link[^>]*rel="manifest"[^>]*href="\/manifest\.webmanifest"[^>]*>/gi, '')
        writeFileSync(adminHtmlPath, html, 'utf-8')
        console.log('Removed main app SW registration from admin.html')
      } catch (error) {
        console.warn('Could not remove main SW from admin.html:', error)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html',
      },
    },
  },
  plugins: [
    react(),
    adminRoutePlugin(),
    generateAdminManifest(),
    removeMainSWFromAdmin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        id: '/',
        name: 'Comenzi LBB',
        short_name: 'Comenzi LBB',
        description: 'Sistem de comenzi LBB',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\//], // Allow all SPA routes (denylist excludes /admin)
        navigateFallbackDenylist: [/^\/admin/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid SW intercepting Vite deps
        type: 'module'
      }
    })
  ],
  optimizeDeps: {
    include: ['qrcode'],
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})












