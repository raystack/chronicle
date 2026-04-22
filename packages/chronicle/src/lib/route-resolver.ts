import type { ChronicleConfig } from '@/types'
import { getLatestContentRoots, getVersionContentRoots } from './config'
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
  if (version.dir === null) {
    return getLatestContentRoots(config).map((root) => root.contentDir)
  }
  return getVersionContentRoots(config, version.dir).map(
    (root) => root.contentDir,
  )
}

function isLandingEnabled(
  config: ChronicleConfig,
  version: VersionContext,
): boolean {
  if (version.dir === null) return config.latest?.landing === true
  return (
    config.versions?.find((v) => v.dir === version.dir)?.landing === true
  )
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
    if (isLandingEnabled(config, version)) {
      return { type: RouteType.DocsIndex, version }
    }
    const dirs = contentDirsFor(config, version)
    if (dirs.length === 0) return { type: RouteType.DocsIndex, version }
    return {
      type: RouteType.Redirect,
      to: `${version.urlPrefix}/${dirs[0]}`,
      status: 302,
    }
  }

  return { type: RouteType.DocsPage, version, slug: parts }
}
