import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StockProvider } from './context/StockContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StockProvider>
      <App />
    </StockProvider>
  </StrictMode>,
)
