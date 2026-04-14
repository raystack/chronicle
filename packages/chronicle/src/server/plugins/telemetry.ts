import { definePlugin } from 'nitro'
import { loadConfig } from '@/lib/config'
import { initTelemetry, recordRequest } from '../telemetry'

export default definePlugin((nitroApp) => {
  const config = loadConfig()
  if (!config.telemetry?.enabled) return

  initTelemetry(config)

  nitroApp.hooks.hook('request', (event) => {
    if (event.path === '/api/metrics') return
    event.context._requestStart = performance.now()
  })

  nitroApp.hooks.hook('response', (res, event) => {
    if (!event.context._requestStart) return
    const duration = performance.now() - event.context._requestStart
    recordRequest(event.method, event.path, res.status, duration)
  })
})
