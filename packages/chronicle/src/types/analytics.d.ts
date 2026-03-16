declare module '@analytics/google-analytics' {
  import type { AnalyticsPlugin } from 'analytics'

  interface GoogleAnalyticsConfig {
    measurementId: string
  }
  export default function googleAnalytics(config: GoogleAnalyticsConfig): AnalyticsPlugin
}

declare module 'use-analytics' {
  import type { ReactNode } from 'react'

  interface AnalyticsInstance {
    page: () => void
    track: (event: string, payload?: Record<string, unknown>) => void
    identify: (userId: string, traits?: Record<string, unknown>) => void
  }

  export function AnalyticsProvider(props: {
    instance: AnalyticsInstance
    children: ReactNode
  }): ReactNode

  export function useAnalytics(): AnalyticsInstance
}
