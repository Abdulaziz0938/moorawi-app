import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ color: 'white', backgroundColor: 'blue', fontSize: '30px', padding: '50px', textAlign: 'center' }}>
      React يعمل بنجاح! 🎉
    </div>
  </StrictMode>,
)
