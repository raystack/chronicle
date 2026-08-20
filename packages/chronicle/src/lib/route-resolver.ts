import { StatusCodes } from 'http-status-codes'
import type { ChronicleConfig } from '@/types'
import { getLatestContentRoots, getVersionContentRoots } from './config'
import { type VersionContext, resolveVersionFromUrl } from './version-source'

export const RouteType = {
  Redirect: 'redirect',
  DocsIndex: 'docs-index',
  DocsPage: 'docs-page',
  ApiIndex: 'api-index',
  ApiPage: 'api-page',
  AuthorIndex: 'author-index',
  AuthorPage: 'author-page',
} as const

export type RouteType = (typeof RouteType)[keyof typeof RouteType]

export type Route =
  | { type: typeof RouteType.Redirect; to: string; status: StatusCodes.TEMPORARY_REDIRECT | StatusCodes.PERMANENT_REDIRECT }
  | { type: typeof RouteType.DocsIndex; version: VersionContext }
  | { type: typeof RouteType.DocsPage; version: VersionContext; slug: string[] }
  | { type: typeof RouteType.ApiIndex; version: VersionContext }
  | { type: typeof RouteType.ApiPage; version: VersionContext; slug: string[] }
  | { type: typeof RouteType.AuthorIndex; version: VersionContext }
  | { type: typeof RouteType.AuthorPage; version: VersionContext; authorSlug: string }

/** True for `/authors` and `/authors/<slug>`. */
export function isAuthorRoute(route: Route): boolean {
  return route.type === RouteType.AuthorIndex || route.type === RouteType.AuthorPage
}

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

const AUTHORS_SEGMENT = 'authors'

/**
 * Author routes are skipped when a content dir is literally named `authors`, so a
 * site that already publishes pages there keeps serving them.
 */
function hasAuthorRoutes(config: ChronicleConfig, version: VersionContext): boolean {
  return !contentDirsFor(config, version).includes(AUTHORS_SEGMENT)
}

/**
 * Url of an author's page, or null when author routes are unavailable because a
 * content dir owns the `authors` segment.
 */
export function authorPageUrl(
  slug: string,
  config: ChronicleConfig,
  version: VersionContext,
): string | null {
  if (!hasAuthorRoutes(config, version)) return null
  return `${version.urlPrefix}/${AUTHORS_SEGMENT}/${encodeURIComponent(slug)}`
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
  const redirect = config.redirects?.find((r) => r.from === pathname)
  if (redirect) {
    return {
      type: RouteType.Redirect,
      to: redirect.to,
      status: redirect.permanent ? StatusCodes.PERMANENT_REDIRECT : StatusCodes.TEMPORARY_REDIRECT,
    }
  }

  const parts = pathname.split('/').filter(Boolean)
  const version = resolveVersionFromUrl(pathname, config)
  const remainder =
    version.dir !== null && parts[0] === version.dir ? parts.slice(1) : parts

  if (remainder[0] === 'apis') {
    const slug = remainder.slice(1)
    if (slug.length === 0) return { type: RouteType.ApiIndex, version }
    return { type: RouteType.ApiPage, version, slug }
  }

  if (remainder[0] === AUTHORS_SEGMENT && hasAuthorRoutes(config, version)) {
    const rest = remainder.slice(1)
    if (rest.length === 0) return { type: RouteType.AuthorIndex, version }
    if (rest.length === 1) return { type: RouteType.AuthorPage, version, authorSlug: rest[0] }
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
      status: StatusCodes.TEMPORARY_REDIRECT,
    }
  }

  return { type: RouteType.DocsPage, version, slug: parts }
}

export function resolveContentRootRedirect(slug: string[], config: ChronicleConfig): string | null {
  if (slug.length !== 1) return null;
  const entry = config.content?.find(c => c.dir === slug[0]);
  if (entry?.index_page) return `/${entry.dir}/${entry.index_page}`;
  return null;
}
