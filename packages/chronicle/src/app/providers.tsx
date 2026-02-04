'use client'

import { ThemeProvider } from '@raystack/apsara'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider enableSystem>{children}</ThemeProvider>
}
