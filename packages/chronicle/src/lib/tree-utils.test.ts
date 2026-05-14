import { describe, expect, test } from 'bun:test'
import type { Node } from 'fumadocs-core/page-tree'
import { getFirstPageUrl, findFolderFirstPage, resolveDocsRedirect } from './tree-utils'

function page(url: string, name = 'Page'): Node {
  return { type: 'page', name, url } as Node
}

function folder(name: string, children: Node[], indexUrl?: string): Node {
  return {
    type: 'folder',
    name,
    children,
    ...(indexUrl ? { index: { url: indexUrl } } : {}),
  } as Node
}

describe('getFirstPageUrl', () => {
  test('returns first page url', () => {
    expect(getFirstPageUrl([page('/docs/intro')])).toBe('/docs/intro')
  })

  test('returns first page from nested folder', () => {
    const nodes = [folder('Guides', [page('/docs/guides/install')])]
    expect(getFirstPageUrl(nodes)).toBe('/docs/guides/install')
  })

  test('skips empty folders', () => {
    const nodes = [folder('Empty', []), page('/docs/hello')]
    expect(getFirstPageUrl(nodes)).toBe('/docs/hello')
  })

  test('returns null for empty list', () => {
    expect(getFirstPageUrl([])).toBeNull()
  })

  test('returns null for folders with no pages', () => {
    expect(getFirstPageUrl([folder('Empty', [])])).toBeNull()
  })
})

describe('findFolderFirstPage', () => {
  test('finds folder by index url', () => {
    const nodes = [
      folder('Guides', [page('/docs/guides/install'), page('/docs/guides/config')], '/docs/guides'),
    ]
    expect(findFolderFirstPage(nodes, '/docs/guides')).toBe('/docs/guides/install')
  })

  test('finds folder without index by child page path', () => {
    const nodes = [
      folder('Guides', [page('/docs/guides/install'), page('/docs/guides/config')]),
    ]
    expect(findFolderFirstPage(nodes, '/docs/guides')).toBe('/docs/guides/install')
  })

  test('finds nested folder', () => {
    const nodes = [
      folder('Docs', [
        folder('Advanced', [page('/docs/advanced/perf'), page('/docs/advanced/debug')]),
      ]),
    ]
    expect(findFolderFirstPage(nodes, '/docs/advanced')).toBe('/docs/advanced/perf')
  })

  test('returns null for non-matching path', () => {
    const nodes = [folder('Guides', [page('/docs/guides/install')])]
    expect(findFolderFirstPage(nodes, '/docs/api')).toBeNull()
  })

  test('returns null for empty folder', () => {
    const nodes = [folder('Empty', [])]
    expect(findFolderFirstPage(nodes, '/docs/empty')).toBeNull()
  })
})

describe('resolveDocsRedirect', () => {
  const tree = {
    children: [
      page('/docs/intro'),
      folder('Guides', [page('/docs/guides/install')]),
    ] as Node[],
  }

  test('redirects to index_page when set', () => {
    expect(resolveDocsRedirect(['docs'], tree, { dir: 'docs', index_page: 'getting-started' }))
      .toBe('/docs/getting-started')
  })

  test('redirects content root to first page', () => {
    expect(resolveDocsRedirect(['docs'], tree, { dir: 'docs' }))
      .toBe('/docs/intro')
  })

  test('redirects folder to first child', () => {
    expect(resolveDocsRedirect(['docs', 'guides'], tree, { dir: 'docs' }))
      .toBe('/docs/guides/install')
  })

  test('returns null for non-matching path', () => {
    expect(resolveDocsRedirect(['docs', 'nonexistent'], tree, { dir: 'docs' }))
      .toBeNull()
  })

  test('returns null without content config', () => {
    expect(resolveDocsRedirect(['other'], tree)).toBeNull()
  })

  test('index_page takes priority over first page', () => {
    expect(resolveDocsRedirect(['docs'], tree, { dir: 'docs', index_page: 'custom' }))
      .toBe('/docs/custom')
  })
})
