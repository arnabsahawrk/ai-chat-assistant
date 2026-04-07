import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Use 'generateSW' for automatic service worker generation with Workbox
      strategies: "generateSW",
      registerType: "prompt", // We handle registration manually for better UX
      injectRegister: false,  // We'll manually register in main.tsx

      // Manifest is served from public/manifest.webmanifest
      manifest: false,

      // Workbox configuration
      workbox: {
        // Cache the app shell and static assets
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}",
        ],
        globIgnores: ["**/node_modules/**/*"],

        // Navigation fallback for SPA routing
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,         // Never cache API calls
          /^\/admin\//,       // Never cache admin
          /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/, // Let images use their own strategy
        ],

        // Runtime caching strategies
        runtimeCaching: [
          // ── Static assets: Cache-first (long-lived) ─────────────────────
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // ── API: Network-first with offline fallback ─────────────────────
          {
            urlPattern: /^https:\/\/ai-chat-assistant-4agm\.onrender\.com\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // ── Google Fonts / CDN: Stale-while-revalidate ───────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // ── Google OAuth / external auth endpoints: Network-only ─────────
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],

        // Skip waiting — new SW activates after prompt
        skipWaiting: false,
        clientsClaim: true,

        // Clean up old caches on activation
        cleanupOutdatedCaches: true,
      },

      // Dev options — service worker enabled in dev for testing
      devOptions: {
        enabled: false, // Disable in dev to avoid cache confusion
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
