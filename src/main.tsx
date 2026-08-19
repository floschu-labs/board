import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Source Sans 3 (identity footer typeface) — no external font requests.
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
