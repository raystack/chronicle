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
  return {
    name: 'root',
    children: transformTree(source.pageTree as FumadocsTreeItem[]),
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
