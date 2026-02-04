import { docs } from '../../.source/server'
import { loader } from 'fumadocs-core/source'
import type { PageTree, PageTreeItem, Frontmatter } from '../types'

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
})

export function sortByOrder<T extends { frontmatter?: Frontmatter }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.frontmatter?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.frontmatter?.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

export function buildPageTree(): PageTree {
  const pages = source.getPages()

  const children: PageTreeItem[] = pages.map((page) => {
    const data = page.data as { title?: string; order?: number }
    return {
      type: 'page' as const,
      name: data.title ?? page.slugs.join('/') ?? 'Untitled',
      url: page.url,
      order: data.order,
    }
  })

  return {
    name: 'root',
    children: children.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    }),
  }
}
