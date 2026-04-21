import type { ChronicleConfig } from '@/types'
import type { VersionContext } from './version-source'

export interface LlmsPage {
  url: string
  title?: string
}

export function buildLlmsTxt(
  config: ChronicleConfig,
  pages: LlmsPage[],
  version: VersionContext,
): string {
  const versionLabel = getVersionLabel(config, version)
  const heading = versionLabel
    ? `# ${config.site.title} — ${versionLabel}`
    : `# ${config.site.title}`

  const description = config.site.description ?? ''

  const index = pages
    .map((p) => {
      const mdUrl = p.url === '/' ? '/index.md' : `${p.url}.md`
      const title = p.title?.trim() || p.url
      return `- [${title}](${mdUrl})`
    })
    .join('\n')

  const parts = [heading]
  if (description) parts.push(description)
  parts.push(index)
  return parts.join('\n\n')
}

function getVersionLabel(
  config: ChronicleConfig,
  version: VersionContext,
): string | null {
  if (version.dir === null) return config.latest?.label ?? null
  return config.versions?.find((v) => v.dir === version.dir)?.label ?? null
}
