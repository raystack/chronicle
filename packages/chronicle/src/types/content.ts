import type { ReactNode } from 'react'

export interface Frontmatter {
  title: string
  description?: string
  order?: number
  icon?: string
}

export interface Page {
  slug: string[]
  frontmatter: Frontmatter
  content: ReactNode
  toc: TocItem[]
}

export interface TocItem {
  title: string
  url: string
  depth: number
}

export interface PageTreeItem {
  type: 'page' | 'folder' | 'separator'
  name: string
  url?: string
  order?: number
  children?: PageTreeItem[]
}

export interface PageTree {
  name: string
  children: PageTreeItem[]
}
