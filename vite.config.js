import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 5173,
    hmr: { overlay: false },
  },

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),

    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { quality: 80 },
      avif: { quality: 80 },
    }),

    VitePWA({
      registerType: 'prompt', // <-- CHANGED TO PROMPT TO ALLOW UI BLOCKING
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'WorkEduMusic India',
        short_name: 'WorkEduMusic',
        description: 'Workforce Management & Compliance System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: "Check In / Out",
            short_name: "Clock In",
            description: "Log your current school visit",
            url: "/employee/dashboard",
            icons: [{ src: "/shortcuts/clock.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Assigned Schools",
            short_name: "Schools",
            description: "View your alloted schools",
            url: "/employee/assignments",
            icons: [{ src: "/shortcuts/school.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Upload Media",
            short_name: "Media",
            description: "Upload your media files",
            url: "/employee/media",
            icons: [{ src: "/shortcuts/media.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Submit Daily Report",
            short_name: "Report",
            description: "Log your daily report",
            url: "/employee/report",
            icons: [{ src: "/shortcuts/report.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Chat",
            short_name: "Chat",
            description: "Chat with peers or admin",
            url: "/employee/chat",
            icons: [{ src: "/shortcuts/message.png", sizes: "192x192", type: "image/png" }]
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));