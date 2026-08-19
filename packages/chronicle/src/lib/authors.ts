import type { Author } from '@/types'

/** `Name <email>` — the second half only counts as an email when it looks like one. */
const SHORTHAND = /^(.*?)\s*<([^<>]*)>$/

/**
 * Parses one frontmatter author string. `Jane Doe <jane@example.com>` splits into
 * name and email; anything else is taken literally as a name, so a contributor can
 * write `authors: [Jane Doe]` without ceremony.
 */
export function parseAuthor(value: string): Author | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = SHORTHAND.exec(trimmed)
  if (!match) return { name: trimmed }

  const name = match[1].trim()
  const email = match[2].trim()
  // `<not an email>` isn't an address — keep the whole string as the name.
  if (!email.includes('@')) return { name: trimmed }
  // `<jane@example.com>` alone has no name to show, so the address stands in.
  if (!name) return { name: email, email }
  return { name, email }
}

/**
 * Normalizes the `authors` frontmatter field into parsed authors. Accepts a list of
 * strings, or a lone string for the common single-author case.
 */
export function parseAuthors(value: unknown): Author[] {
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? value : []
  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map(parseAuthor)
    .filter((author): author is Author => author !== null)
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
