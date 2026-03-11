import { source } from '@/lib/source'
import { loadConfig } from '@/lib/config'
import { llms } from 'fumadocs-core/source'

export const revalidate = false

export function GET() {
  const config = loadConfig()

  if (!config.llms?.enabled) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(llms(source).index())
}
