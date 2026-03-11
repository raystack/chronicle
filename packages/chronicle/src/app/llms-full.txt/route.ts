import { source } from '@/lib/source'
import { loadConfig } from '@/lib/config'
import { getLLMText } from '@/lib/get-llm-text'

export const revalidate = false

export async function GET() {
  const config = loadConfig()

  if (!config.llms?.enabled) {
    return new Response('Not Found', { status: 404 })
  }

  const scan = source.getPages().map(getLLMText)
  const scanned = await Promise.all(scan)

  return new Response(scanned.join('\n\n'))
}
