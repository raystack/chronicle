import type { MetadataRoute } from 'next'
import { loadConfig } from '@/lib/config'
import { source } from '@/lib/source'
import { loadApiSpecs } from '@/lib/openapi'
import { buildApiRoutes } from '@/lib/api-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  const config = loadConfig()
  if (!config.url) return []

  const baseUrl = config.url.replace(/\/$/, '')

  const docPages = source.getPages().map((page) => ({
    url: `${baseUrl}/${page.slugs.join('/')}`,
    ...(page.data.lastModified && { lastModified: new Date(page.data.lastModified) }),
  }))

  const apiPages = config.api?.length
    ? buildApiRoutes(loadApiSpecs(config.api)).map((route) => ({
        url: `${baseUrl}/apis/${route.slug.join('/')}`,
      }))
    : []

  return [
    { url: baseUrl },
    ...docPages,
    ...apiPages,
  ]
}
