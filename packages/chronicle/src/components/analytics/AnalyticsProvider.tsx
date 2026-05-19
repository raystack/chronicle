import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { AnalyticsProvider as Provider, useAnalytics } from 'use-analytics'
import type { ReactNode } from 'react'
import type { AnalyticsConfig } from '@/types'
import type { AnalyticsInstance } from 'analytics'

function PageViewTracker() {
  const { page } = useAnalytics()
  const { pathname } = useLocation()

  useEffect(() => {
    try { page() } catch { /* noop */ }
  }, [pathname, page])

  return null
}

export function AnalyticsProvider({
  config,
  children,
}: {
  config: AnalyticsConfig
  children: ReactNode
}) {
  const [analytics, setAnalytics] = useState<AnalyticsInstance | null>(null)

  useEffect(() => {
    if (!config.enabled) return
    try {
      const plugins: unknown[] = []
      if (config.googleAnalytics?.measurementId) {
        import('@analytics/google-analytics').then(({ default: googleAnalytics }) => {
          plugins.push(
            googleAnalytics({
              measurementIds: [config.googleAnalytics!.measurementId],
            })
          )
          import('analytics').then(({ default: Analytics }) => {
            setAnalytics(Analytics({ app: 'chronicle', plugins }))
          })
        })
      }
    } catch { /* noop */ }
  }, [config])

  if (!analytics) return <>{children}</>

  return (
    <Provider instance={analytics}>
      <PageViewTracker />
      {children}
    </Provider>
  )
}
