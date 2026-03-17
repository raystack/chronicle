import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { getSpecSlug } from '@/lib/api-routes'
import type { OpenAPIV3 } from 'openapi-types'

interface SearchDocument {
  id: string
  url: string
  title: string
  content: string
  type: 'page' | 'api'
}

function extractHeadings(markdown: string): string {
  const headingRegex = /^#{1,6}\s+(.+)$/gm
  const headings: string[] = []
  let match
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[1].trim())
  }
  return headings.join(' ')
}

async function scanContent(contentDir: string): Promise<SearchDocument[]> {
  const docs: SearchDocument[] = []

  async function scan(dir: string, prefix: string[] = []) {
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) }
    catch { return }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await scan(fullPath, [...prefix, entry.name])
        continue
      }

      if (!entry.name.endsWith('.mdx') && !entry.name.endsWith('.md')) continue

      const raw = await fs.readFile(fullPath, 'utf-8')
      const { data: fm, content } = matter(raw)
      const baseName = entry.name.replace(/\.(mdx|md)$/, '')
      const slugs = baseName === 'index' ? prefix : [...prefix, baseName]
      const url = slugs.length === 0 ? '/' : '/' + slugs.join('/')

      docs.push({
        id: url,
        url,
        title: fm.title ?? baseName,
        content: extractHeadings(content),
        type: 'page',
      })
    }
  }

  await scan(contentDir)
  return docs
}

function buildApiDocs(): SearchDocument[] {
  const config = loadConfig()
  if (!config.api?.length) return []

  const docs: SearchDocument[] = []
  const specs = loadApiSpecs(config.api)

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec)
    const paths = spec.document.paths ?? {}
    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method] as OpenAPIV3.OperationObject | undefined
        if (!op?.operationId) continue
        const url = `/apis/${specSlug}/${encodeURIComponent(op.operationId)}`
        docs.push({
          id: url,
          url,
          title: `${method.toUpperCase()} ${op.summary ?? op.operationId}`,
          content: op.description ?? '',
          type: 'api',
        })
      }
    }
  }

  return docs
}

export async function generateSearchIndex(contentDir: string, outDir: string) {
  const [contentDocs, apiDocs] = await Promise.all([
    scanContent(contentDir),
    Promise.resolve(buildApiDocs()),
  ])

  const documents = [...contentDocs, ...apiDocs]
  const outPath = path.join(outDir, 'search-index.json')
  await fs.writeFile(outPath, JSON.stringify(documents))

  return documents.length
}
