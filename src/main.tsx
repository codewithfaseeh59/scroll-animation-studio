import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { getLocalStorage, initPersistence } from './store/persistence'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

// Open the right project (a share link, the last saved one or a new one) before the first paint.
void initPersistence({
  storage: getLocalStorage(),
  hash: window.location.hash,
  clearHash: () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  },
}).then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
