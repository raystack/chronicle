import type { ReactNode } from 'react'
import type { TableOfContents } from 'fumadocs-core/toc'

export type { Root, Node, Item, Folder, Separator } from 'fumadocs-core/page-tree'
export type { TOCItemType, TableOfContents } from 'fumadocs-core/toc'

/**
 * A page author. Built either from an `authors` frontmatter string or, when that
 * string names a key in the config registry, from that entry's full profile.
 */
export interface Author {
  /** Stable identifier: the registry key, or the name slugified. */
  slug: string
  name: string
  email?: string
  bio?: string
  avatar?: string
  url?: string
}

export interface Frontmatter {
  title: string
  /**
   * Short label for navigation — a package or command name such as `SPP`. Falls
   * back to `title`. Useful where the full title is too long for a sidebar but
   * the page is known by a code its readers already use.
   */
  short?: string
  description?: string
  order?: number
  icon?: string
  lastModified?: string
  authors?: string[]
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

/**
 * One content root offered on the landing page. Built from config rather than
 * from the page tree, so it is available before any page is loaded.
 *
 * It lives here rather than beside `getLandingEntries` in `lib/config.ts`
 * because `types/theme.ts` needs it for the `Landing` slot, and a type in
 * `types/` importing from `lib/` would close an import cycle.
 */
export interface LandingEntry {
  label: string
  description?: string
  href: string
  contentDir: string
  icon?: string
}
