import type { ReactNode } from 'react'
import type { TableOfContents } from 'fumadocs-core/toc'

export type { Root, Node, Item, Folder, Separator } from 'fumadocs-core/page-tree'
export type { TOCItemType, TableOfContents } from 'fumadocs-core/toc'

export interface Frontmatter {
  title: string
  description?: string
  order?: number
  icon?: string
  lastModified?: string
}

export interface Page {
  slug: string[]
  frontmatter: Frontmatter
  content: ReactNode
  toc: TableOfContents
}
