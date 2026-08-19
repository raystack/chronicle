import { describe, expect, test } from 'bun:test';
import type { ChronicleConfig, Frontmatter } from '@/types';
import { buildAuthorIndex, findAuthor } from './author-index';

const config = {
  content: [
    { dir: 'docs', label: 'Docs' },
    { dir: 'guides', label: 'Guides' },
  ],
  authors: {
    jane: { name: 'Jane Doe', bio: 'Writes about systems.', avatar: '/team/jane.png' },
  },
} as unknown as ChronicleConfig;

function page(url: string, frontmatter: Partial<Frontmatter> & { title: string }) {
  return { url, frontmatter: frontmatter as Frontmatter }
}

describe('buildAuthorIndex', () => {
  test('groups pages under each author', () => {
    const index = buildAuthorIndex(
      [
        page('/docs/a', { title: 'A', authors: ['jane'] }),
        page('/docs/b', { title: 'B', authors: ['jane', 'Sam Patel'] }),
      ],
      config,
    )

    expect(index.authors.map(a => [a.slug, a.pages.length])).toEqual([
      ['jane', 2],
      ['sam-patel', 1],
    ])
  })

  test('carries the registry profile onto the summary', () => {
    const index = buildAuthorIndex([page('/docs/a', { title: 'A', authors: ['jane'] })], config)
    expect(index.authors[0]).toMatchObject({
      slug: 'jane',
      name: 'Jane Doe',
      bio: 'Writes about systems.',
      avatar: '/team/jane.png',
    })
  })

  test('labels each page with its content dir', () => {
    const index = buildAuthorIndex(
      [
        page('/docs/a', { title: 'A', authors: ['jane'] }),
        page('/guides/b', { title: 'B', authors: ['jane'] }),
      ],
      config,
    )
    expect(index.authors[0].pages.map(p => [p.dir, p.dirLabel])).toEqual([
      ['docs', 'Docs'],
      ['guides', 'Guides'],
    ])
  })

  test('falls back to the dir name when it has no configured label', () => {
    const index = buildAuthorIndex([page('/blog/a', { title: 'A', authors: ['jane'] })], config)
    expect(index.authors[0].pages[0].dirLabel).toBe('blog')
  })

  test('sorts pages newest first, undated last, then by title', () => {
    const index = buildAuthorIndex(
      [
        page('/docs/old', { title: 'Old', authors: ['jane'], lastModified: '2026-01-01' }),
        page('/docs/zeta', { title: 'Zeta', authors: ['jane'] }),
        page('/docs/new', { title: 'New', authors: ['jane'], lastModified: '2026-06-01' }),
        page('/docs/alpha', { title: 'Alpha', authors: ['jane'] }),
      ],
      config,
    )
    expect(index.authors[0].pages.map(p => p.title)).toEqual(['New', 'Old', 'Alpha', 'Zeta'])
  })

  test('sorts authors by name', () => {
    const index = buildAuthorIndex(
      [page('/docs/a', { title: 'A', authors: ['Zoe Adams', 'Adam Zeal'] })],
      config,
    )
    expect(index.authors.map(a => a.name)).toEqual(['Adam Zeal', 'Zoe Adams'])
  })

  test('skips pages that declare no authors', () => {
    const index = buildAuthorIndex([page('/docs/a', { title: 'A' })], config)
    expect(index.authors).toEqual([])
  })

  test('keeps a registry key and a same-named literal separate', () => {
    const index = buildAuthorIndex(
      [
        page('/docs/a', { title: 'A', authors: ['jane'] }),
        page('/docs/b', { title: 'B', authors: ['Jane Doe'] }),
      ],
      config,
    )
    expect(index.authors.map(a => a.slug)).toEqual(['jane', 'jane-doe'])
  })
})

describe('findAuthor', () => {
  test('looks an author up by slug', () => {
    const index = buildAuthorIndex([page('/docs/a', { title: 'A', authors: ['jane'] })], config)
    expect(findAuthor(index, 'jane')?.name).toBe('Jane Doe')
    expect(findAuthor(index, 'nobody')).toBeUndefined()
  })
})
