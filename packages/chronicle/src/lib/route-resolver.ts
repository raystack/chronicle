import type { ChronicleConfig } from '@/types'
import { type VersionContext, resolveVersionFromUrl } from './version-source'

export type Route =
  | { type: 'redirect'; to: string; status: 302 }
  | { type: 'docs-index'; version: VersionContext }
  | { type: 'docs-page'; version: VersionContext; slug: string[] }
  | { type: 'api-index'; version: VersionContext }
  | { type: 'api-page'; version: VersionContext; slug: string[] }

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
    if (slug.length === 0) return { type: 'api-index', version }
    return { type: 'api-page', version, slug }
  }

  if (remainder.length === 0) {
    const dirs = contentDirsFor(config, version)
    if (dirs.length === 1) {
      return {
        type: 'redirect',
        to: `${version.urlPrefix}/${dirs[0]}`,
        status: 302,
      }
    }
    return { type: 'docs-index', version }
  }

  return { type: 'docs-page', version, slug: parts }
}
