import type { MDXContent } from 'mdx/types'
import type { Frontmatter, PageTree, PageTreeItem } from '@/types'

const meta: Record<string, Frontmatter> = import.meta.glob(
  '@content/**/*.{mdx,md}',
  { eager: true, import: 'frontmatter' }
)

const loaders: Record<string, () => Promise<{ default: MDXContent }>> = import.meta.glob(
  '@content/**/*.{mdx,md}'
)

export interface SourcePage {
  url: string
  slugs: string[]
  filePath: string
  frontmatter: Frontmatter
}

// Compute common directory prefix of all glob keys once
function computePrefix(keys: string[]): string {
  if (keys.length === 0) return ''
  const dirs = keys.map((k) => k.split('/').slice(0, -1)) // drop filename
  const first = dirs[0]
  let depth = 0
  for (let i = 0; i < first.length; i++) {
    if (dirs.every((d) => d[i] === first[i])) {
      depth = i + 1
    } else {
      break
    }
  }
  return first.slice(0, depth).join('/') + '/'
}

const prefix = computePrefix(Object.keys(meta))

function filePathToSlugs(filePath: string): string[] {
  const relative = filePath.slice(prefix.length)
  const withoutExt = relative.replace(/\.(mdx|md)$/, '')
  const parts = withoutExt.split('/').filter(Boolean)
  if (parts[parts.length - 1] === 'index') parts.pop()
  return parts
}

function slugsToUrl(slugs: string[]): string {
  return slugs.length === 0 ? '/' : '/' + slugs.join('/')
}

let cachedPages: SourcePage[] | null = null

export async function getPages(): Promise<SourcePage[]> {
  if (cachedPages) return cachedPages

  cachedPages = Object.entries(meta).map(([filePath, fm]) => {
    const slugs = filePathToSlugs(filePath)
    const baseName = slugs[slugs.length - 1] ?? 'index'
    return {
      url: slugsToUrl(slugs),
      slugs,
      filePath,
      frontmatter: {
        title: fm?.title ?? baseName,
        description: fm?.description,
        order: fm?.order,
        icon: fm?.icon,
        lastModified: fm?.lastModified,
      },
    }
  })

  return cachedPages
}

export async function getPage(slug?: string[]): Promise<SourcePage | null> {
  const pages = await getPages()
  const targetUrl = !slug || slug.length === 0 ? '/' : '/' + slug.join('/')
  return pages.find((p) => p.url === targetUrl) ?? null
}

export async function loadPageComponent(page: SourcePage): Promise<MDXContent | null> {
  const loader = loaders[page.filePath]
  if (!loader) return null
  const mod = await loader()
  return mod.default
}

export function invalidate() {
  cachedPages = null
}

export async function buildPageTree(): Promise<PageTree> {
  const pages = await getPages()
  const folders = new Map<string, PageTreeItem[]>()
  const rootPages: PageTreeItem[] = []

  pages.forEach((page) => {
    const isIndex = page.url === '/'
    const item: PageTreeItem = {
      type: 'page',
      name: page.frontmatter.title,
      url: page.url,
      order: page.frontmatter.order ?? (isIndex ? 0 : undefined),
    }

    if (page.slugs.length > 1) {
      const folder = page.slugs[0]
      if (!folders.has(folder)) {
        folders.set(folder, [])
      }
      folders.get(folder)?.push(item)
    } else {
      rootPages.push(item)
    }
  })

  const sortByOrder = (items: PageTreeItem[]) =>
    items.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))

  const children: PageTreeItem[] = sortByOrder(rootPages)

  const folderItems: PageTreeItem[] = []
  folders.forEach((items, folder) => {
    const sorted = sortByOrder(items)
    const indexPage = items.find(item => item.url === `/${folder}`)
    const folderOrder = indexPage?.order ?? sorted[0]?.order
    folderItems.push({
      type: 'folder',
      name: folder.charAt(0).toUpperCase() + folder.slice(1),
      order: folderOrder,
      children: sorted,
    })
  })

  children.push(...sortByOrder(folderItems))

  return { name: 'root', children }
}
