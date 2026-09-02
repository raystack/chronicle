import { parse } from 'yaml'
import {
  type ApiConfig,
  type BadgeConfig,
  type ChronicleConfig,
  chronicleConfigSchema,
  type LandingEntry,
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

  const parsed = chronicleConfigSchema.parse(parse(raw))
  return {
    ...defaultConfig,
    ...parsed,
    theme: { ...defaultConfig.theme, ...parsed.theme },
    search: { ...defaultConfig.search, ...parsed.search },
  }
}

export interface ContentRoot {
  versionDir: string | null
  versionLabel: string | null
  contentDir: string
  contentLabel: string
  contentDescription?: string
  contentIcon?: string
  fsPath: string
  urlPrefix: string
}

export function getLatestContentRoots(config: ChronicleConfig): ContentRoot[] {
  return config.content.map((c) => ({
    versionDir: null,
    versionLabel: config.latest?.label ?? null,
    contentDir: c.dir,
    contentLabel: c.label,
    contentDescription: c.description,
    contentIcon: c.icon,
    fsPath: `content/${c.dir}`,
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
    contentDescription: c.description,
    contentIcon: c.icon,
    fsPath: `versions/${version.dir}/${c.dir}`,
    urlPrefix: `/${version.dir}/${c.dir}`,
  }))
}

export interface VersionDescriptor {
  dir: string | null
  label: string
  badge?: BadgeConfig
  isLatest: boolean
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
    description: r.contentDescription,
    href: r.urlPrefix,
    contentDir: r.contentDir,
    icon: r.contentIcon,
  }))
}

export function getApiConfigsForVersion(
  config: ChronicleConfig,
  versionDir: string | null,
): ApiConfig[] {
  if (versionDir === null) return config.api ?? []
  return (
    config.versions?.find((v) => v.dir === versionDir)?.api ?? []
  )
}

export function getAllVersions(config: ChronicleConfig): VersionDescriptor[] {
  const result: VersionDescriptor[] = [
    {
      dir: null,
      label: config.latest?.label ?? '',
      isLatest: true,
    },
  ]

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
