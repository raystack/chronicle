import type { Counter, Histogram } from '@opentelemetry/api'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { definePlugin } from 'nitro'
import { loadConfig } from '@/lib/config'

declare module 'nitro/types' {
  interface NitroRuntimeHooks {
    'chronicle:ssr-rendered': (route: string, status: number, durationMs: number) => void
  }
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
    ssrRenderDuration.record(durationMs, { route, status })
  })

  nitroApp.hooks.hook('request', (event) => {
    event.context._requestStart = performance.now()
  })

  nitroApp.hooks.hook('response', (res, event) => {
    if (!event.context._requestStart) return
    const duration = performance.now() - event.context._requestStart
    requestCounter.add(1, { method: event.method, route: event.path, status: res.status })
    requestDuration.record(duration, { method: event.method, route: event.path, status: res.status })
  })
})
