import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[PWA] offline ready')
  },
  onNeedRefresh() {
    console.info('[PWA] new version available — refresh to update')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
