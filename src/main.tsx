import React, { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import './index.css'

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

function TestError() {
  const [error, setError] = useState<any>(null);
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    // نقوم بتحميل MessagesTab بشكل ديناميكي لاصطياد أي خطأ أثناء التحميل
    import('./components/MessagesTab')
      .then(mod => setComp(() => mod.default))
      .catch(err => {
        console.error("Caught error:", err);
        setError(err);
      });
  }, []);

  if (error) {
    return (
      <div style={{ color: 'white', backgroundColor: 'red', padding: '20px', zIndex: 9999, position: 'relative', wordBreak: 'break-all' }}>
        <h3>حدث خطأ أثناء تحميل المكون:</h3>
        <p>{error.toString()}</p>
        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
      </div>
    );
  }
  
  if (!Comp) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>جاري التحميل...</div>;
  
  return <Comp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <TestError />
    </ConvexProvider>
  </StrictMode>,
)
