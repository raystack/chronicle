import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineHandler } from 'nitro'
import { getExporter } from '../telemetry'

export default defineHandler(async () => {
  const exporter = getExporter()
  if (!exporter) {
    return new Response('Telemetry not enabled', { status: 404 })
  }

  const metricsString = await new Promise<string>((resolve) => {
    const mockRes = {
      setHeader: () => mockRes,
      end: (data: string) => resolve(data),
    } as unknown as ServerResponse

    exporter.getMetricsRequestHandler({} as unknown as IncomingMessage, mockRes)
  })

  return new Response(metricsString, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
