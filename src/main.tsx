import React, { StrictMode } from 'react' // <-- أضفنا React هنا
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import App from './App.tsx'
import './index.css'
import { DialogHost } from './lib/dialog'
import { AssetsProvider } from './lib/assets'

// رابط Convex
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://scrupulous-chipmunk-417.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

// شبكة أمان لالتقاط أي خطأ وعرضه
class ErrorCatcher extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', backgroundColor: 'red', padding: '20px', fontSize: '14px', zIndex: 99999, position: 'relative' }}>
          <h2>حدث خطأ في التطبيق:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '10px' }}>{this.state.error?.stack}</pre>
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
          <div style={{ color: 'white', backgroundColor: 'blue', fontSize: '30px', padding: '50px', textAlign: 'center' }}>
  التطبيق بدأ!
</div>
          <DialogHost />
        </AssetsProvider>
      </ConvexProvider>
    </ErrorCatcher>
  </StrictMode>,
)
