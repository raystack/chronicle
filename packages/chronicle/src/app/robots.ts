import type { MetadataRoute } from 'next'
import { loadConfig } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  const config = loadConfig()
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(config.url && { sitemap: `${config.url}/sitemap.xml` }),
  }
}
