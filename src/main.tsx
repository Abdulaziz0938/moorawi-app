import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "sonner"
import App from './App.tsx'
import './index.css'
import { DialogHost } from './lib/dialog'
import { AssetsProvider } from './lib/assets'
import AppErrorBoundary from './components/AppErrorBoundary'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

// رابط Convex
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://scrupulous-chipmunk-417.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ConvexProvider client={convex}>
        <AssetsProvider>
          <App />
          <DialogHost />
          <Toaster position="top-center" theme="dark" closeButton richColors />
        </AssetsProvider>
      </ConvexProvider>
    </AppErrorBoundary>
  </StrictMode>,
)

// إخفاء شاشة البداية فقط إذا كنا داخل تطبيق الهاتف (APK)
if (Capacitor.isNativePlatform()) {
  SplashScreen.hide().catch(err => console.error("Splash screen error:", err));
}
