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
  const folders = new Map<string, PageTreeItem[]>()
  const rootPages: PageTreeItem[] = []

  pages.forEach((page) => {
    const data = page.data as { title?: string; order?: number }
    const item: PageTreeItem = {
      type: 'page',
      name: data.title ?? page.slugs.join('/') ?? 'Untitled',
      url: page.url,
      order: data.order,
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

  folders.forEach((items, folder) => {
    children.push({
      type: 'folder',
      name: folder.charAt(0).toUpperCase() + folder.slice(1),
      children: sortByOrder(items),
    })
  })

  return { name: 'root', children }
}
