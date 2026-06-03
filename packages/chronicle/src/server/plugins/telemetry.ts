import type { Counter, Histogram } from '@opentelemetry/api'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import type { H3Event } from 'h3'
import { definePlugin } from 'nitro'
import { loadConfig } from '@/lib/config'

declare module 'nitro/types' {
  interface NitroRuntimeHooks {
    'chronicle:ssr-rendered': (route: string, status: number, durationMs: number) => void
  }
}

const ENDPOINT_MAP: [string, string | null][] = [
  ['/api/', null],
  ['/_content/', '/_content/:path'],
  ['/apis/', '/apis/:slug'],
  ['/assets/', '/assets/:file'],
]

const STATIC_ROUTES = new Set(['/llms.txt', '/robots.txt', '/sitemap.xml', '/og'])

function toEndpoint(pathname: string): string {
  if (pathname === '/') return '/';
  for (const [prefix, template] of ENDPOINT_MAP) {
    if (pathname.startsWith(prefix)) return template ?? pathname;
  }
  if (STATIC_ROUTES.has(pathname)) return pathname;
  return '/docs/:slug';
}

export default definePlugin((nitroApp) => {
  const config = loadConfig()
  if (!config.telemetry?.enabled) return

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.telemetry?.serviceName ?? 'chronicle',
  })

  const port = config.telemetry?.port ?? 9090
  const exporter = new PrometheusExporter({ port })
  const provider = new MeterProvider({ resource, readers: [exporter] })
  const meter = provider.getMeter('chronicle')

  const requestCounter: Counter = meter.createCounter('http_server_request_total', {
    description: 'Total HTTP requests',
  })
  const requestDuration: Histogram = meter.createHistogram('http_server_request_duration_ms', {
    description: 'HTTP request duration in ms',
  })
  const ssrRenderDuration: Histogram = meter.createHistogram('http_server_ssr_render_duration_ms', {
    description: 'SSR render duration in ms',
  })

  nitroApp.hooks.hook('close', async () => {
    await provider.shutdown()
    await exporter.shutdown()
  })

  nitroApp.hooks.hook('chronicle:ssr-rendered', (route, status, durationMs) => {
    ssrRenderDuration.record(durationMs, { route: toEndpoint(route), status })
  })

  nitroApp.hooks.hook('request', (event) => {
    (event as H3Event).context._requestStart = performance.now()
  })

  nitroApp.hooks.hook('response', (res, event) => {
    const start = (event as H3Event).context._requestStart as number | undefined
    if (start === undefined) return
    const duration = performance.now() - start
    const method = event.req.method
    const endpoint = toEndpoint(new URL(event.req.url).pathname)
    requestCounter.add(1, { method, endpoint, status: res.status })
    requestDuration.record(duration, { method, endpoint, status: res.status })
  })
})
