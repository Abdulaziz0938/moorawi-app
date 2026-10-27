import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ 
      color: 'white', 
      backgroundColor: 'green', 
      fontSize: '30px', 
      padding: '50px', 
      textAlign: 'center',
      position: 'relative',
      zIndex: 9999
    }}>
      الحد الأدنى يعمل!
    </div>
  </StrictMode>,
)
