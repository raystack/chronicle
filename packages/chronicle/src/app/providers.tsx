'use client'

import { ThemeProvider } from '@raystack/apsara'
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider'
import type { ReactNode } from 'react'
import type { AnalyticsConfig } from '@/types'

export function Providers({
  children,
  analytics,
}: {
  children: ReactNode
  analytics: AnalyticsConfig
}) {
  return (
    <ThemeProvider enableSystem>
      <AnalyticsProvider config={analytics}>{children}</AnalyticsProvider>
    </ThemeProvider>
  )
}
