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
  appName,
  children,
}: {
  config: AnalyticsConfig
  appName: string
  children: ReactNode
}) {
  const [analytics, setAnalytics] = useState<AnalyticsInstance | null>(null)

  useEffect(() => {
    if (!config.enabled) {
      setAnalytics(null)
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        const plugins: unknown[] = []
        if (config.googleAnalytics?.measurementId) {
          const { default: googleAnalytics } = await import('@analytics/google-analytics')
          plugins.push(
            googleAnalytics({
              measurementIds: [config.googleAnalytics.measurementId],
            })
          )
        }
        const { default: Analytics } = await import('analytics')
        if (!cancelled) setAnalytics(Analytics({ app: appName, plugins }))
      } catch {
        if (!cancelled) setAnalytics(null)
      }
    }

    void init()
    return () => { cancelled = true }
  }, [config.enabled, config.googleAnalytics?.measurementId, appName])

  if (!analytics) return <>{children}</>

  return (
    <Provider instance={analytics}>
      <PageViewTracker />
      {children}
    </Provider>
  )
}
