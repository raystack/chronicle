import { describe, expect, test } from 'bun:test'
import type { Node, Folder } from 'fumadocs-core/page-tree'
import { parentPath, getFolderPath } from './folder-utils'

function page(url: string): Node {
  return { type: 'page', name: 'Page', url } as Node
}

function folder(name: string, children: Node[], indexUrl?: string): Folder {
  return {
    type: 'folder',
    name,
    children,
    ...(indexUrl ? { index: { url: indexUrl } } : {}),
  } as Folder
}

describe('parentPath', () => {
  test('returns parent of page URL', () => {
    expect(parentPath('/docs/guides/install')).toBe('/docs/guides')
  })

  test('returns root for top-level page', () => {
    expect(parentPath('/docs')).toBe('/')
  })

  test('handles trailing segments', () => {
    expect(parentPath('/a/b/c/d')).toBe('/a/b/c')
  })

  test('handles root', () => {
    expect(parentPath('/')).toBe('/')
  })
})

describe('getFolderPath', () => {
  test('returns index URL when folder has index', () => {
    const f = folder('Guides', [page('/docs/guides/install')], '/docs/guides')
    expect(getFolderPath(f)).toBe('/docs/guides')
  })

  test('derives path from direct child page', () => {
    const f = folder('Guides', [page('/docs/guides/install')])
    expect(getFolderPath(f)).toBe('/docs/guides')
  })

  test('derives path from subfolder child (not deeply nested)', () => {
    const f = folder('Tasking', [
      folder('Via Order Desk', [page('/docs/tasking/via_order_desk/package')])
    ])
    expect(getFolderPath(f)).toBe('/docs/tasking')
  })

  test('handles folder with & in path', () => {
    const f = folder('Cart & Order', [page('/docs/cart&order/working_with_cart')])
    expect(getFolderPath(f)).toBe('/docs/cart&order')
  })

  test('handles folder with space in path', () => {
    const f = folder('My Folder', [page('/docs/my folder/intro')])
    expect(getFolderPath(f)).toBe('/docs/my folder')
  })

  test('returns null for empty folder', () => {
    const f = folder('Empty', [])
    expect(getFolderPath(f)).toBeNull()
  })

  test('prefers direct child page over subfolder', () => {
    const f = folder('Mixed', [
      page('/docs/mixed/intro'),
      folder('Sub', [page('/docs/mixed/sub/deep')])
    ])
    expect(getFolderPath(f)).toBe('/docs/mixed')
  })

  test('deeply nested only-subfolder chain', () => {
    const f = folder('Root', [
      folder('Mid', [
        folder('Deep', [page('/a/b/c/d/page')])
      ])
    ])
    expect(getFolderPath(f)).toBe('/a/b')
  })
})
