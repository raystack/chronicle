'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Analytics from 'analytics'
import googleAnalytics from '@analytics/google-analytics'
import { AnalyticsProvider as Provider, useAnalytics } from 'use-analytics'
import type { ReactNode } from 'react'
import type { AnalyticsConfig } from '@/types'

function PageViewTracker() {
  const { page } = useAnalytics()
  const pathname = usePathname()

  useEffect(() => {
    page()
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
  if (!config.enabled) return <>{children}</>

  const plugins = []
  if (config.googleAnalytics?.measurementId) {
    plugins.push(
      googleAnalytics({
        measurementId: config.googleAnalytics.measurementId,
      })
    )
  }

  const analytics = Analytics({ app: 'chronicle', plugins })

  return (
    <Provider instance={analytics}>
      <PageViewTracker />
      {children}
    </Provider>
  )
}
