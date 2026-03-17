import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'

export function handleSpecs(): Response {
  const config = loadConfig()
  const specs = config.api?.length ? loadApiSpecs(config.api) : []

  return Response.json(specs)
}
