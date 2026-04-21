import path from 'node:path'
import { parse } from 'yaml'
import {
  type BadgeConfig,
  type ChronicleConfig,
  chronicleConfigSchema,
} from '@/types'

const defaultConfig: ChronicleConfig = chronicleConfigSchema.parse({
  site: { title: 'Documentation' },
  content: [{ dir: 'docs', label: 'Docs' }],
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search...' },
})

export function loadConfig(): ChronicleConfig {
  const raw =
    typeof __CHRONICLE_CONFIG_RAW__ !== 'undefined'
      ? __CHRONICLE_CONFIG_RAW__
      : null

  if (!raw) return defaultConfig

  return chronicleConfigSchema.parse(parse(raw))
}

export interface ContentRoot {
  versionDir: string | null
  versionLabel: string | null
  contentDir: string
  contentLabel: string
  fsPath: string
  urlPrefix: string
}

export function getLatestContentRoots(config: ChronicleConfig): ContentRoot[] {
  return config.content.map((c) => ({
    versionDir: null,
    versionLabel: config.latest?.label ?? null,
    contentDir: c.dir,
    contentLabel: c.label,
    fsPath: path.join('content', c.dir),
    urlPrefix: `/${c.dir}`,
  }))
}

export function getVersionContentRoots(
  config: ChronicleConfig,
  versionDir: string,
): ContentRoot[] {
  const version = config.versions?.find((v) => v.dir === versionDir)
  if (!version) return []

  return version.content.map((c) => ({
    versionDir: version.dir,
    versionLabel: version.label,
    contentDir: c.dir,
    contentLabel: c.label,
    fsPath: path.join('versions', version.dir, c.dir),
    urlPrefix: `/${version.dir}/${c.dir}`,
  }))
}

export interface VersionDescriptor {
  dir: string | null
  label: string
  badge?: BadgeConfig
  isLatest: boolean
}

export interface LandingEntry {
  label: string
  href: string
  contentDir: string
}

export function getLandingEntries(
  config: ChronicleConfig,
  versionDir: string | null,
): LandingEntry[] {
  const roots =
    versionDir === null
      ? getLatestContentRoots(config)
      : getVersionContentRoots(config, versionDir)

  return roots.map((r) => ({
    label: r.contentLabel,
    href: r.urlPrefix,
    contentDir: r.contentDir,
  }))
}

export function getAllVersions(config: ChronicleConfig): VersionDescriptor[] {
  const result: VersionDescriptor[] = []

  if (config.latest) {
    result.push({ dir: null, label: config.latest.label, isLatest: true })
  }

  for (const v of config.versions ?? []) {
    result.push({
      dir: v.dir,
      label: v.label,
      badge: v.badge,
      isLatest: false,
    })
  }

  return result
}
