import { loadConfig } from '@/lib/config'
import { source } from '@/lib/source'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiRoutes } from '@/lib/api-routes'

export function handleSitemap(): Response {
  const config = loadConfig()
  if (!config.url) {
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
      headers: { 'Content-Type': 'application/xml' },
    })
  }

  const baseUrl = config.url.replace(/\/$/, '')

  const docPages = source.getPages().map((page) => {
    const lastmod = page.data.lastModified
      ? `<lastmod>${new Date(page.data.lastModified).toISOString()}</lastmod>`
      : ''
    return `<url><loc>${baseUrl}/${page.slugs.join('/')}</loc>${lastmod}</url>`
  })

  const apiPages = config.api?.length
    ? buildApiRoutes(loadApiSpecs(config.api)).map((route) =>
        `<url><loc>${baseUrl}/apis/${route.slug.join('/')}</loc></url>`
      )
    : []

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${baseUrl}</loc></url>
${[...docPages, ...apiPages].join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
