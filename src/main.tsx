import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import App from './App.tsx'
import './index.css'

// وضعنا الرابط مباشرة هنا لضمان عدم وجود خطأ في قراءته
const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)
