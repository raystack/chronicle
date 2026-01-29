import { loader } from 'fumadocs-core/source'
import { createMDXSource } from 'fumadocs-mdx'
import type { PageTree, PageTreeItem, Frontmatter } from '../types'

interface SourceOptions {
  contentDir?: string
}

export function createSource(options: SourceOptions = {}) {
  const { contentDir = './content' } = options

  return loader({
    baseUrl: '/docs',
    source: createMDXSource(contentDir, {
      // frontmatter schema handled by fumadocs
    }),
  })
}

export function sortByOrder<T extends { frontmatter?: Frontmatter }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.frontmatter?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.frontmatter?.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

export function buildPageTree(source: ReturnType<typeof createSource>): PageTree {
  const pages = source.getPages()
  // Transform fumadocs page tree to our format
  return {
    name: 'root',
    children: transformTree(source.pageTree),
  }
}

interface FumadocsTreeItem {
  type?: 'page' | 'folder' | 'separator'
  name: string
  url?: string
  children?: FumadocsTreeItem[]
}

function transformTree(tree: FumadocsTreeItem[]): PageTreeItem[] {
  return tree.map((item) => ({
    type: item.type ?? 'page',
    name: item.name,
    url: item.url,
    children: item.children ? transformTree(item.children) : undefined,
  }))
}
