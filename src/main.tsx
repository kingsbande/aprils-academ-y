import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register/react'

let updateSW: (() => Promise<void>) | undefined
updateSW = registerSW({
  onRegistered(r) {
    console.log('Service worker registered:', r)
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error)
  },
  onNeedRefresh() {
    console.log('A new version is available. Reloading to apply update.')
    updateSW?.().then(() => {
      window.location.reload()
    })
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
