import type { ChronicleConfig } from '@/types'
import {
  getLandingEntries,
  getLatestContentRoots,
  getVersionContentRoots,
} from './config'
import { resolveVersionFromUrl } from './version-source'

export function getActiveContentDir(
  url: string,
  config: ChronicleConfig,
): string | null {
  const version = resolveVersionFromUrl(url, config)
  const parts = url.split('/').filter(Boolean)
  const remainder =
    version.dir !== null && parts[0] === version.dir ? parts.slice(1) : parts

  if (remainder.length === 0) return null
  if (remainder[0] === 'apis') return null

  const dirs =
    version.dir === null
      ? getLatestContentRoots(config).map((root) => root.contentDir)
      : getVersionContentRoots(config, version.dir).map(
          (root) => root.contentDir,
        )

  return dirs.includes(remainder[0]) ? remainder[0] : null
}

export function getVersionHomeHref(
  config: ChronicleConfig,
  versionDir: string | null,
): string {
  const entries = getLandingEntries(config, versionDir)
  if (entries.length === 1) return entries[0].href
  return versionDir ? `/${versionDir}` : '/'
}

export interface ContentButtonSplit<T> {
  visible: T[]
  overflow: T[]
}

export function splitContentButtons<T>(
  items: T[],
  max: number,
): ContentButtonSplit<T> {
  if (items.length <= max) return { visible: items, overflow: [] }
  return { visible: items.slice(0, max), overflow: items.slice(max) }
}
