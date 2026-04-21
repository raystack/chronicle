import type { ChronicleConfig } from '@/types'
import type { VersionContext } from './version-source'

export interface LlmsPage {
  url: string
  title: string
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

  const description = config.description ?? ''

  const index = pages
    .map((p) => {
      const mdUrl = p.url === '/' ? '/index.md' : `${p.url}.md`
      return `- [${p.title}](${mdUrl})`
    })
    .join('\n')

  return `${heading}\n\n${description}\n\n${index}`
}

function getVersionLabel(
  config: ChronicleConfig,
  version: VersionContext,
): string | null {
  if (version.dir === null) return config.latest?.label ?? null
  return config.versions?.find((v) => v.dir === version.dir)?.label ?? null
}
