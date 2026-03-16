import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <App>
    {/* Phase 2 will add client-side routing */}
    <div />
  </App>,
)
