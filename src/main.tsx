import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "sonner"
import { Analytics } from "@vercel/analytics/react"
import App from './App.tsx'
import './index.css'
import { DialogHost } from './lib/dialog'
import { AssetsProvider } from './lib/assets'
import AppErrorBoundary from './components/AppErrorBoundary'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

// [ezo-pwa] Capture beforeinstallprompt EARLY — before React mounts
declare global {
  interface Window {
    __ezo_deferred_prompt: any;
    __ezo_pwa_ready: boolean;
  }
}
window.__ezo_deferred_prompt = null;
window.__ezo_pwa_ready = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    (window as any).__ezo_deferred_prompt = e;
    window.__ezo_pwa_ready = true;
    window.dispatchEvent(new CustomEvent("ezo:beforeinstallprompt"));
    console.log("[PWA] beforeinstallprompt captured");
  });
  window.addEventListener("appinstalled", () => {
    (window as any).__ezo_deferred_prompt = null;
    window.__ezo_pwa_ready = false;
    window.dispatchEvent(new CustomEvent("ezo:appinstalled"));
    console.log("[PWA] app installed");
  });
  console.log("[PWA] listener registered — waiting for event");
}

// رابط احتياطي لـ Convex في حال لم يقرأه Vercel من الإعدادات
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://scrupulous-chipmunk-417.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ConvexProvider client={convex}>
        <AssetsProvider>
          <App />
          <DialogHost />
          <Toaster
            position="top-center"
            theme="dark"
            closeButton
            richColors
            toastOptions={{
              style: {
                background: "rgba(15, 10, 30, 0.95)",
                border: "1px solid rgba(168, 85, 247, 0.35)",
                color: "white",
                backdropFilter: "blur(14px)",
                borderRadius: "16px",
                fontWeight: 700,
              },
            }}
          />
          <Analytics />
        </AssetsProvider>
      </ConvexProvider>
    </AppErrorBoundary>
  </StrictMode>,
)

// إخفاء شاشة البداية فقط إذا كنا داخل تطبيق الهاتف (APK)
if (Capacitor.isNativePlatform()) {
  SplashScreen.hide().catch(err => console.error("Splash screen error:", err));
}
