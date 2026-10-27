import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react"
import { api } from "../convex/_generated/api" // <--- تم تصحيح المسار هنا
import './index.css'

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

function TestConvex() {
  // نطلب بيانات تجريبية من Convex
  const me = useQuery(api.auth.me, { tokenOverride: "test" });
  
  if (me === undefined) {
     return <div style={{color:'white', backgroundColor:'orange', padding: '50px', fontSize: '24px', textAlign: 'center'}}>جاري الاتصال بـ Convex...</div>
  }
  
  return <div style={{color:'white', backgroundColor:'green', padding: '50px', fontSize: '24px', textAlign: 'center'}}>تم الاتصال بـ Convex بنجاح! 🎉</div>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <TestConvex />
    </ConvexProvider>
  </StrictMode>,
)
