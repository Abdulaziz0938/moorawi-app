import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react"
import Dashboard from './components/Dashboard' // استدعاء الشاشة الرئيسية مباشرة
import './index.css'

const convex = new ConvexReactClient("https://scrupulous-chipmunk-417.eu-west-1.convex.cloud");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <Dashboard 
        onEnterRoom={(id) => console.log('Enter Room', id)} 
        onEnterLive={(id) => console.log('Enter Live', id)} 
        onStartLive={(id) => console.log('Start Live', id)} 
      />
    </ConvexProvider>
  </StrictMode>,
)
