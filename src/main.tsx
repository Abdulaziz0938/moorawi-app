import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "sonner"
import { Analytics } from "@vercel/analytics/react"
import App from './App.tsx'
import './index.css'
import { DialogHost } from './lib/dialog'
import { AssetsProvider } from './lib/assets'

// رابط Convex
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://scrupulous-chipmunk-417.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

// شبكة أمان (إذا صار أي خطأ بالمستقبل، سيظهر لك بالشاشة بدل السواد)
class ErrorCatcher extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', backgroundColor: 'red', padding: '20px', fontSize: '14px', zIndex: 99999, position: 'relative', wordBreak: 'break-all' }}>
          <h2>حدث خطأ:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorCatcher>
      <ConvexProvider client={convex}>
        <AssetsProvider>
          <App />
          <DialogHost />
          <Toaster position="top-center" theme="dark" closeButton richColors />
          <Analytics />
        </AssetsProvider>
      </ConvexProvider>
    </ErrorCatcher>
  </StrictMode>,
)
