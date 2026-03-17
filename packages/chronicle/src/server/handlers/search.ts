import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import MiniSearch from 'minisearch'
import type { OpenAPIV3 } from 'openapi-types'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs, type ApiSpec } from '@/lib/openapi'
import { getSpecSlug } from '@/lib/api-routes'

interface SearchDocument {
  id: string
  url: string
  title: string
  content: string
  type: 'page' | 'api'
}

let searchIndex: MiniSearch<SearchDocument> | null = null

function getContentDir(): string {
  return process.env.CHRONICLE_CONTENT_DIR || path.join(process.cwd(), 'content')
}

async function scanContent(): Promise<SearchDocument[]> {
  const contentDir = getContentDir()
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
        content: content.slice(0, 5000),
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
    for (const [pathStr, pathItem] of Object.entries(paths)) {
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

async function getIndex(): Promise<MiniSearch<SearchDocument>> {
  if (searchIndex) return searchIndex

  const [contentDocs, apiDocs] = await Promise.all([
    scanContent(),
    Promise.resolve(buildApiDocs()),
  ])

  searchIndex = new MiniSearch<SearchDocument>({
    fields: ['title', 'content'],
    storeFields: ['url', 'title', 'type'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  })

  searchIndex.addAll([...contentDocs, ...apiDocs])
  return searchIndex
}

export async function handleSearch(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const query = url.searchParams.get('query') ?? ''
  const index = await getIndex()

  if (!query) {
    const contentDocs = await scanContent()
    const suggestions = contentDocs.slice(0, 8).map((d) => ({
      id: d.id,
      url: d.url,
      type: d.type,
      content: d.title,
    }))
    return Response.json(suggestions)
  }

  const results = index.search(query).map((r) => ({
    id: r.id,
    url: r.url,
    type: r.type,
    content: r.title,
  }))

  return Response.json(results)
}
