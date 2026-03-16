import { loadConfig } from '@/lib/config'

export function handleRobots(): Response {
  const config = loadConfig()
  const sitemap = config.url ? `\nSitemap: ${config.url}/sitemap.xml` : ''
  const body = `User-agent: *\nAllow: /${sitemap}`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
