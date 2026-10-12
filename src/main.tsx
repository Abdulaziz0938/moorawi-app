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

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
