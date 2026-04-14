import type { Counter, Histogram } from '@opentelemetry/api'
import sdkMetrics from '@opentelemetry/sdk-metrics'
import prometheusExporter from '@opentelemetry/exporter-prometheus'
import resources from '@opentelemetry/resources'
import semconv from '@opentelemetry/semantic-conventions'
import type { ChronicleConfig } from '@/types/config'

const { MeterProvider } = sdkMetrics
const { PrometheusExporter } = prometheusExporter
const { resourceFromAttributes } = resources
const { ATTR_SERVICE_NAME } = semconv

let exporter: PrometheusExporter
let requestCounter: Counter
let requestDuration: Histogram
let ssrRenderDuration: Histogram

export function initTelemetry(config: ChronicleConfig) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.telemetry?.serviceName ?? 'chronicle',
  })

  exporter = new PrometheusExporter({ preventServerStart: true })
  const provider = new MeterProvider({ resource, readers: [exporter] })
  const meter = provider.getMeter('chronicle')

  requestCounter = meter.createCounter('http_server_request_total', {
    description: 'Total HTTP requests',
  })
  requestDuration = meter.createHistogram('http_server_request_duration_ms', {
    description: 'HTTP request duration in ms',
  })
  ssrRenderDuration = meter.createHistogram('http_server_ssr_render_duration_ms', {
    description: 'SSR render duration in ms',
  })
}

export function getExporter() {
  return exporter
}

export function recordRequest(method: string, route: string, status: number, durationMs: number) {
  requestCounter?.add(1, { method, route, status })
  requestDuration?.record(durationMs, { method, route, status })
}

export function recordSSRRender(route: string, status: number, durationMs: number) {
  ssrRenderDuration?.record(durationMs, { route, status })
}
