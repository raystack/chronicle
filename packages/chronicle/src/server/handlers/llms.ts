import { source } from '@/lib/source'
import { loadConfig } from '@/lib/config'
import { llms } from 'fumadocs-core/source'
import { getLLMText } from '@/lib/get-llm-text'

export function handleLlms(): Response {
  const config = loadConfig()

  if (!config.llms?.enabled) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(llms(source).index(), {
    headers: { 'Content-Type': 'text/plain' },
  })
}

export async function handleLlmsFull(): Promise<Response> {
  const config = loadConfig()

  if (!config.llms?.enabled) {
    return new Response('Not Found', { status: 404 })
  }

  const scan = source.getPages().map(getLLMText)
  const scanned = await Promise.all(scan)

  return new Response(scanned.join('\n\n'), {
    headers: { 'Content-Type': 'text/plain' },
  })
}
