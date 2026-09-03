/**
 * The letter a site is reduced to when it sets no `logo`. Codepoint-safe, so an
 * emoji or a non-Latin script survives being taken apart.
 */
export function siteInitial(title: string): string {
  const first = Array.from(title.trim())[0]
  return first ? first.toUpperCase() : '?'
}
