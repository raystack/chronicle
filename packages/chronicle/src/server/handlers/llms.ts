import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { loadConfig } from '@/lib/config'

function getContentDir(): string {
  return process.env.CHRONICLE_CONTENT_DIR || path.join(process.cwd(), 'content')
}

async function scanPages(): Promise<{ title: string; url: string }[]> {
  const contentDir = getContentDir()
  const pages: { title: string; url: string }[] = []

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
      const { data: fm } = matter(raw)
      const baseName = entry.name.replace(/\.(mdx|md)$/, '')
      const slugs = baseName === 'index' ? prefix : [...prefix, baseName]
      const url = slugs.length === 0 ? '/' : '/' + slugs.join('/')

      pages.push({ title: fm.title ?? baseName, url })
    }
  }

  await scan(contentDir)
  return pages
}

export async function handleLlms(): Promise<Response> {
  const config = loadConfig()

  if (!config.llms?.enabled) {
    return new Response('Not Found', { status: 404 })
  }

  const pages = await scanPages()
  const index = pages.map((p) => `- [${p.title}](${p.url})`).join('\n')
  const body = `# ${config.title}\n\n${config.description ?? ''}\n\n${index}`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
