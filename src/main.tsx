import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import Dashboard from './components/Dashboard'
import './index.css'

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

// شبكة أمان لاصطياد الخطأ وعرضه بدلاً من الشاشة السوداء
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', backgroundColor: 'red', padding: '20px', fontSize: '16px', zIndex: 99999, position: 'relative', wordBreak: 'break-all' }}>
          <h2>خطأ في Dashboard:</h2>
          <p>{this.state.error?.toString()}</p>
          <pre style={{fontSize: '12px', whiteSpace: 'pre-wrap'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <Dashboard 
          onEnterRoom={(id) => console.log('Enter Room', id)} 
          onEnterLive={(id) => console.log('Enter Live', id)} 
          onStartLive={(id) => console.log('Start Live', id)} 
        />
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>,
)
