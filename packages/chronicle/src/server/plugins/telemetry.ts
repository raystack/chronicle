import type { Counter, Histogram } from '@opentelemetry/api'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs'
import { SeverityNumber } from '@opentelemetry/api-logs'
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

const ROUTES = {
  ROOT: '/',
  DOCS: '/docs/:slug',
  API_INTERNAL: '/api/:action',
  API_REFERENCE: '/apis/:slug',
  ASSETS: '/assets/:file',
  CONTENT: '/_content/:path',
} as const

const ENDPOINT_MAP: [string, string | null][] = [
  ['/api/', null],
  ['/_content/', ROUTES.CONTENT],
  ['/apis/', ROUTES.API_REFERENCE],
  ['/assets/', ROUTES.ASSETS],
]

const STATIC_ROUTES = new Set(['/llms.txt', '/robots.txt', '/sitemap.xml', '/og'])

const DOC_PATH_PREFIX = /^\/(?:docs|developer|v\d+)\//

export function toEndpoint(pathname: string): string | null {
  if (pathname === '/') return ROUTES.ROOT;
  for (const [prefix, template] of ENDPOINT_MAP) {
    if (pathname.startsWith(prefix)) return template ?? pathname;
  }
  if (STATIC_ROUTES.has(pathname)) return pathname;
  if (DOC_PATH_PREFIX.test(pathname)) return ROUTES.DOCS;
  return null;
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

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
  })
  const logger = loggerProvider.getLogger('chronicle')

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
    await loggerProvider.shutdown()
    await provider.shutdown()
    await exporter.shutdown()
  })

  nitroApp.hooks.hook('chronicle:ssr-rendered', (route, status, durationMs) => {
    const endpoint = toEndpoint(route)
    if (endpoint) ssrRenderDuration.record(durationMs, { route: endpoint, status })
  })

  nitroApp.hooks.hook('request', (event) => {
    (event as H3Event).context._requestStart = performance.now()
  })

  nitroApp.hooks.hook('response', (res, event) => {
    const start = (event as H3Event).context._requestStart as number | undefined
    if (start === undefined) return
    const duration = performance.now() - start
    const method = event.req.method
    const route = new URL(event.req.url).pathname
    const endpoint = toEndpoint(route)

    const clientIp =
      event.req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ??
      event.req.headers['x-real-ip']?.toString() ??
      event.req.socket?.remoteAddress ??
      'unknown'

    if (endpoint) {
      requestCounter.add(1, { method, endpoint, status: res.status })
      requestDuration.record(duration, { method, endpoint, status: res.status })
    }

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `${method} ${route} ${res.status} ${duration.toFixed(1)}ms`,
      attributes: {
        'client.address': clientIp,
        'http.request.method': method,
        'url.path': route,
        'http.response.status_code': res.status,
        'http.request.duration_ms': Math.round(duration),
      },
    })

  })
})
