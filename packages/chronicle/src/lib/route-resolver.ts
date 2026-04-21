import type { ChronicleConfig } from '@/types'
import { type VersionContext, resolveVersionFromUrl } from './version-source'

export const RouteType = {
  Redirect: 'redirect',
  DocsIndex: 'docs-index',
  DocsPage: 'docs-page',
  ApiIndex: 'api-index',
  ApiPage: 'api-page',
} as const

export type RouteType = (typeof RouteType)[keyof typeof RouteType]

export type Route =
  | { type: typeof RouteType.Redirect; to: string; status: 302 }
  | { type: typeof RouteType.DocsIndex; version: VersionContext }
  | { type: typeof RouteType.DocsPage; version: VersionContext; slug: string[] }
  | { type: typeof RouteType.ApiIndex; version: VersionContext }
  | { type: typeof RouteType.ApiPage; version: VersionContext; slug: string[] }

function contentDirsFor(
  config: ChronicleConfig,
  version: VersionContext,
): string[] {
  if (version.dir === null) return config.content.map((c) => c.dir)
  const v = config.versions?.find((x) => x.dir === version.dir)
  return v?.content.map((c) => c.dir) ?? []
}

export function resolveRoute(
  pathname: string,
  config: ChronicleConfig,
): Route {
  const parts = pathname.split('/').filter(Boolean)
  const version = resolveVersionFromUrl(pathname, config)
  const remainder =
    version.dir !== null && parts[0] === version.dir ? parts.slice(1) : parts

  if (remainder[0] === 'apis') {
    const slug = remainder.slice(1)
    if (slug.length === 0) return { type: RouteType.ApiIndex, version }
    return { type: RouteType.ApiPage, version, slug }
  }

  if (remainder.length === 0) {
    const dirs = contentDirsFor(config, version)
    if (dirs.length === 1) {
      return {
        type: RouteType.Redirect,
        to: `${version.urlPrefix}/${dirs[0]}`,
        status: 302,
      }
    }
    return { type: RouteType.DocsIndex, version }
  }

  return { type: RouteType.DocsPage, version, slug: parts }
}
