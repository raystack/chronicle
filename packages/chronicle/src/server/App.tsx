import '@raystack/apsara/normalize.css'
import '@raystack/apsara/style.css'
import { ThemeProvider } from '@raystack/apsara'
import type { ReactNode } from 'react'

interface AppProps {
  children: ReactNode
}

export function App({ children }: AppProps) {
  return (
    <ThemeProvider enableSystem>
      {children}
    </ThemeProvider>
  )
}
