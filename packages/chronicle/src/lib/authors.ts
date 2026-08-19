import type { Author, ChronicleConfig } from '@/types'

/** `Name <email>` — the second half only counts as an email when it looks like one. */
const SHORTHAND = /^(.*?)\s*<([^<>]*)>$/

/** URL-safe identifier for an author who has no registry entry. */
export function slugifyAuthorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Parses one frontmatter author string. `Jane Doe <jane@example.com>` splits into
 * name and email; anything else is taken literally as a name, so a contributor can
 * write `authors: [Jane Doe]` without ceremony.
 */
export function parseAuthor(value: string): Author | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = SHORTHAND.exec(trimmed)
  if (!match) return withSlug({ name: trimmed })

  const name = match[1].trim()
  const email = match[2].trim()
  // `<not an email>` isn't an address — keep the whole string as the name.
  if (!email.includes('@')) return withSlug({ name: trimmed })
  // `<jane@example.com>` alone has no name to show, so the address stands in.
  if (!name) return withSlug({ name: email, email })
  return withSlug({ name, email })
}

function withSlug(author: Omit<Author, 'slug'>): Author {
  return { slug: slugifyAuthorName(author.name), ...author }
}

/**
 * Resolves one frontmatter author string against the config registry. A string that
 * names a registry key carries that entry's full profile — bio, avatar, links —
 * while anything else falls back to the `Name <email>` shorthand.
 */
export function resolveAuthor(value: string, config?: ChronicleConfig): Author | null {
  const key = value.trim()
  const entry = key ? config?.authors?.[key] : undefined
  if (!entry) return parseAuthor(value)
  return { ...entry, slug: key }
}

/** Resolves the whole `authors` frontmatter field against the registry. */
export function resolveAuthors(value: unknown, config?: ChronicleConfig): Author[] {
  return toAuthorStrings(value)
    .map(entry => resolveAuthor(entry, config))
    .filter((author): author is Author => author !== null)
}

/**
 * Normalizes the `authors` frontmatter field into parsed authors. Accepts a list of
 * strings, or a lone string for the common single-author case.
 */
export function parseAuthors(value: unknown): Author[] {
  return toAuthorStrings(value)
    .map(parseAuthor)
    .filter((author): author is Author => author !== null)
}

function toAuthorStrings(value: unknown): string[] {
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? value : []
  return list.filter((entry): entry is string => typeof entry === 'string')
}

/**
 * Keeps the `authors` frontmatter field as written, accepting a lone string for the
 * single-author case. Use `parseAuthors` when you need the parsed form.
 */
export function normalizeAuthorList(value: unknown): string[] | undefined {
  if (typeof value === 'string') return [value]
  if (!Array.isArray(value)) return undefined
  const entries = value.filter((entry): entry is string => typeof entry === 'string')
  return entries.length > 0 ? entries : undefined
}

/** Up to two letters for an avatar fallback: `Jane Doe` → `JD`, `Jane` → `J`. */
export function authorInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${words[0][0]}${last}`.toUpperCase()
}
