import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setupUpdates } from './lib/pwaUpdate'
import '@fontsource-variable/inter'
import './styles.css'

document.documentElement.dataset.build = __BUILD__
setupUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
