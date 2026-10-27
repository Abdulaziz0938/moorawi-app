import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

function AppLoader() {
  const [AppComp, setAppComp] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // نقوم بتحميل App.tsx ديناميكياً لاصطياد أي خطأ يحدث قبل تشغيل React
    import('./App.tsx')
      .then((mod) => setAppComp(() => mod.default))
      .catch((err) => {
        console.error("App.tsx load error:", err);
        setError(err);
      });
  }, []);

  if (error) {
    return (
      <div style={{ color: 'white', backgroundColor: 'red', padding: '20px', zIndex: 9999, position: 'relative', fontSize: '14px', wordBreak: 'break-all' }}>
        <h3>حدث خطأ أثناء تحميل التطبيق:</h3>
        <p>{error.toString()}</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{error.stack}</pre>
      </div>
    );
  }

  if (!AppComp) return <div style={{ color: 'white', padding: '20px', fontSize: '20px', textAlign: 'center', marginTop: '50px' }}>جاري التحميل...</div>;

  return <AppComp />;
}

createRoot(document.getElementById('root')!).render(
  <ConvexProvider client={convex}>
    <AppLoader />
  </ConvexProvider>
)
