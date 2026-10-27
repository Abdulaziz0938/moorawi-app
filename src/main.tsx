import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import AuthScreen from './components/AuthScreen' // استدعاء شاشة الدخول مباشرة
import './index.css'

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <AuthScreen onSuccess={(token) => console.log("تم تسجيل الدخول", token)} />
    </ConvexProvider>
  </StrictMode>,
)
