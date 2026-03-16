import type { MetadataRoute } from 'next'
import { loadConfig } from '@/lib/config'
import { source } from '@/lib/source'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiRoutes } from '@/lib/api-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  const config = loadConfig()
  const baseUrl = config.url ?? ''

  const docPages = source.getPages().map((page) => ({
    url: `${baseUrl}/${page.slugs.join('/')}`,
    lastModified: page.data.lastModified ? new Date(page.data.lastModified) : new Date(),
  }))

  const apiPages = config.api?.length
    ? buildApiRoutes(loadApiSpecs(config.api)).map((route) => ({
        url: `${baseUrl}/apis/${route.slug.join('/')}`,
        lastModified: new Date(),
      }))
    : []

  return [
    { url: baseUrl, lastModified: new Date() },
    ...docPages,
    ...apiPages,
  ]
}
