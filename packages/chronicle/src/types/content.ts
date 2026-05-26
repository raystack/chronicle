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
  draft?: boolean
  _readingTime?: number
}

export interface PageNavLink {
  url: string
  title: string
}

export interface PageNav {
  prev: PageNavLink | null
  next: PageNavLink | null
}

export const SearchResultType = {
  Page: 'page',
  Api: 'api',
} as const;

export type SearchResultType = (typeof SearchResultType)[keyof typeof SearchResultType];

export const SearchMatchType = {
  Title: 'title',
  Heading: 'heading',
  Body: 'body',
} as const;

export type SearchMatchType = (typeof SearchMatchType)[keyof typeof SearchMatchType];

export interface Page extends PageNav {
  slug: string[]
  frontmatter: Frontmatter
  content: ReactNode
  toc: TableOfContents
}
