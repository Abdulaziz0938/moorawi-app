import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: './', // ضروري جداً لـ APK
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      strategies: "generateSW",
      filename: "sw.js",
      manifest: {
        name: "EZO GROUP — Voice Chat Rooms",
        short_name: "EZO GROUP",
        description: "دردشة صوتية وغرف وشات روم",
        start_url: "./",
        scope: "./",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        background_color: "#1a0b2e",
        theme_color: "#1a0b2e",
        lang: "ar",
        dir: "rtl",
        categories: ["social", "communication", "entertainment"],
        prefer_related_applications: false,
        icons: [
          { src: "/favicon-32.png", sizes: "32x32", type: "image/png", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: [],
        navigateFallback: null,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@convex": path.resolve(import.meta.dirname, "./convex"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: { 
    chunkSizeWarningLimit: 1000,
    target: 'esnext', // مهم جداً لمكتبة libpag
  },
});
