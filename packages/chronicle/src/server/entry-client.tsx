import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <BrowserRouter>
    <App url={window.location.href} />
  </BrowserRouter>,
)
