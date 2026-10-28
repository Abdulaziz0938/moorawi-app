import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from 'vite-plugin-static-copy'; // إضافة جديدة

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
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
        ],
        shortcuts: [
          {
            name: "الغرف الصوتية",
            short_name: "الغرف",
            description: "تصفح الغرف الصوتية",
            url: "./?tab=rooms",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "الرسائل",
            short_name: "رسائل",
            description: "المحادثات والرسائل",
            url: "./?tab=messages",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "ملفي",
            short_name: "أنا",
            description: "الملف الشخصي",
            url: "./?tab=me",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: [],
        navigateFallback: null,
      },
      devOptions: { enabled: false },
    }),
    // ✅ إضافة جديدة: نسخ ملف wasm الخاص بـ libpag
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/libpag/lib/libpag.wasm',
          dest: 'assets' // سيتم نسخه إلى مجلد assets في الإخراج
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@convex": path.resolve(import.meta.dirname, "./convex"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: { 
    chunkSizeWarningLimit: 1000,
    target: 'esnext', // مهم جداً
    // تم إزالة rolldownOptions بالكامل
  },
});
