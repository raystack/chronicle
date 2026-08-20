import { resolveAuthors } from './authors'
import type { Author, ChronicleConfig, Frontmatter } from '@/types'

/** One page written by an author, as listed on that author's page. */
export interface AuthorPageEntry {
  url: string
  title: string
  description?: string
  /** Content dir the page lives in, so listings can group by section. */
  dir: string
  /** `label` of the matching content entry, falling back to the dir name. */
  dirLabel: string
  lastModified?: string
}

export interface AuthorSummary extends Author {
  pages: AuthorPageEntry[]
}

/** The shape served by `/api/authors` and `/data/authors.json`. */
export interface AuthorIndex {
  authors: AuthorSummary[]
}

interface IndexablePage {
  url: string
  frontmatter: Frontmatter
}

function contentDirOf(url: string): string {
  return url.replace(/^\//, '').split('/')[0] ?? ''
}

/** Newest first; pages without a date sort after dated ones, then by title. */
function byRecency(a: AuthorPageEntry, b: AuthorPageEntry): number {
  if (a.lastModified && b.lastModified) {
    const diff = new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    if (diff !== 0) return diff
  } else if (a.lastModified) {
    return -1
  } else if (b.lastModified) {
    return 1
  }
  return a.title.localeCompare(b.title)
}

/**
 * Groups pages by the authors declared in their frontmatter. Authors are keyed by
 * slug, so a registry key and a bare name never collide, and the first page that
 * names an author supplies the profile shown for them.
 */
export function buildAuthorIndex(pages: IndexablePage[], config: ChronicleConfig): AuthorIndex {
  const dirLabels = new Map((config.content ?? []).map(entry => [entry.dir, entry.label]))
  const summaries = new Map<string, AuthorSummary>()

  for (const page of pages) {
    const authors = resolveAuthors(page.frontmatter.authors, config)
    if (authors.length === 0) continue

    const dir = contentDirOf(page.url)
    const entry: AuthorPageEntry = {
      url: page.url,
      title: page.frontmatter.title,
      ...(page.frontmatter.description && { description: page.frontmatter.description }),
      dir,
      dirLabel: dirLabels.get(dir) ?? dir,
      ...(page.frontmatter.lastModified && { lastModified: page.frontmatter.lastModified }),
    }

    for (const author of authors) {
      const existing = summaries.get(author.slug)
      if (existing) existing.pages.push(entry)
      else summaries.set(author.slug, { ...author, pages: [entry] })
    }
  }

  const authors = [...summaries.values()]
    .map(author => ({ ...author, pages: author.pages.sort(byRecency) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { authors }
}

export function findAuthor(index: AuthorIndex, slug: string): AuthorSummary | undefined {
  return index.authors.find(author => author.slug === slug)
}
