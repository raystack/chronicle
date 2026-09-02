/**
 * `@analytics/google-analytics` ships no types. It is only ever used as an
 * `analytics` plugin factory, so that is all this declares.
 */
declare module '@analytics/google-analytics' {
  import type { AnalyticsPlugin } from 'analytics'

  interface GoogleAnalyticsOptions {
    measurementIds: string[]
  }

  export default function googleAnalytics(
    options: GoogleAnalyticsOptions,
  ): AnalyticsPlugin
}
