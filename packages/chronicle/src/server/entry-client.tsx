import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <App url={window.location.href} />,
)
