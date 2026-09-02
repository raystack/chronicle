import { describe, expect, test } from 'bun:test'
import type { Node, Root } from 'fumadocs-core/page-tree'
import type { ChronicleConfig } from '@/types'
import type { VersionContext } from './version-source'
import { getFirstPageUrl, findFolderFirstPage, resolveDocsRedirect, resolvePageAndSlug, compactTree, shortName } from './tree-utils'

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

describe('resolvePageAndSlug', () => {
  const treeDef = {
    children: [
      page('/docs/intro'),
      folder('Guides', [page('/docs/guides/install'), page('/docs/guides/config')]),
    ] as Node[],
  }

  const config: ChronicleConfig = {
    site: { title: 'Test' },
    content: [{ dir: 'docs', label: 'Docs' }],
  }

  const version: VersionContext = { dir: null, urlPrefix: '' }

  function makeDeps(pages: Record<string, unknown> = {}) {
    return {
      getPage: async (slug: string[]) => pages[slug.join('/')] ?? null,
      getPageTree: async () => treeDef,
      isDraft: () => false,
      config,
      version,
    }
  }

  test('returns page when found directly', async () => {
    const pageObj = { title: 'Intro' }
    const result = await resolvePageAndSlug(['docs', 'intro'], makeDeps({ 'docs/intro': pageObj }))
    expect(result).toEqual({ page: pageObj, slug: ['docs', 'intro'] })
  })

  test('resolves folder slug to first child page', async () => {
    const installPage = { title: 'Install' }
    const deps = makeDeps({ 'docs/guides/install': installPage })
    const result = await resolvePageAndSlug(['docs', 'guides'], deps)
    expect(result).toEqual({ page: installPage, slug: ['docs', 'guides', 'install'] })
  })

  test('returns null for non-matching slug', async () => {
    const result = await resolvePageAndSlug(['docs', 'nonexistent'], makeDeps())
    expect(result).toBeNull()
  })

  test('returns null when resolved page is draft', async () => {
    const draftPage = { title: 'Draft' }
    const deps = {
      ...makeDeps({ 'docs/guides/install': draftPage }),
      isDraft: () => true,
    }
    const result = await resolvePageAndSlug(['docs', 'guides'], deps)
    expect(result).toBeNull()
  })
})

describe('compactTree', () => {
  test('strips $ref and $id from page nodes', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'page', name: 'Intro', url: '/docs/intro',
        $ref: 'docs/intro.mdx', $id: 'docs/intro.mdx',
      } as Node],
    }
    const result = compactTree(tree)
    expect(result.children[0]).toEqual({ type: 'page', name: 'Intro', url: '/docs/intro' })
  })

  test('strips description and root from folder nodes', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'folder', name: 'Guides',
        description: 'Guide section', root: true,
        children: [{ type: 'page', name: 'Install', url: '/guides/install', $ref: 'install.mdx' } as Node],
      } as Node],
    }
    const result = compactTree(tree)
    const folder = result.children[0] as any
    expect(folder.description).toBeUndefined()
    expect(folder.root).toBeUndefined()
    expect(folder.name).toBe('Guides')
    expect(folder.children[0]).toEqual({ type: 'page', name: 'Install', url: '/guides/install' })
  })

  test('preserves separator nodes', () => {
    const tree: Root = {
      name: 'root',
      children: [{ type: 'separator' } as Node],
    }
    const result = compactTree(tree)
    expect(result.children[0]).toEqual({ type: 'separator' })
  })

  test('preserves separator name and icon', () => {
    const tree: Root = {
      name: 'root',
      children: [{ type: 'separator', name: 'Section', icon: 'star' } as Node],
    }
    const result = compactTree(tree)
    expect(result.children[0]).toEqual({ type: 'separator', name: 'Section', icon: 'star' })
  })

  test('preserves folder index and strips its extra fields', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'folder', name: 'Docs',
        index: { type: 'page', name: 'Overview', url: '/docs', $ref: 'docs/index.mdx' },
        children: [{ type: 'page', name: 'Intro', url: '/docs/intro' } as Node],
      } as Node],
    }
    const result = compactTree(tree)
    const folder = result.children[0] as any
    expect(folder.index).toEqual({ type: 'page', name: 'Overview', url: '/docs' })
  })

  test('preserves icon field', () => {
    const tree: Root = {
      name: 'root',
      children: [{ type: 'page', name: 'Home', url: '/', icon: 'home', $id: 'x' } as Node],
    }
    const result = compactTree(tree)
    expect(result.children[0]).toEqual({ type: 'page', name: 'Home', url: '/', icon: 'home' })
  })

  test('page leaf only keeps type, name, url, icon', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'page', name: 'Test', url: '/test', icon: 'doc',
        $ref: 'test.mdx', $id: 'test', description: 'A test page', external: true,
      } as Node],
    }
    const result = compactTree(tree)
    const node = result.children[0] as any
    expect(Object.keys(node).sort()).toEqual(['icon', 'name', 'type', 'url'])
  })

  test('separator leaf strips unknown fields', () => {
    const tree: Root = {
      name: 'root',
      children: [{ type: 'separator', name: 'Divider', $id: 'sep1', root: true } as Node],
    }
    const result = compactTree(tree)
    const node = result.children[0] as any
    expect(Object.keys(node).sort()).toEqual(['name', 'type'])
  })

  test('folder index is compacted as leaf', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'folder', name: 'Docs',
        index: { type: 'page', name: 'Index', url: '/docs', $ref: 'index.mdx', $id: 'idx', description: 'main' },
        children: [],
      } as Node],
    }
    const result = compactTree(tree)
    const idx = (result.children[0] as any).index
    expect(Object.keys(idx).sort()).toEqual(['name', 'type', 'url'])
  })

  test('recursively compacts nested folders', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'folder', name: 'L1', $ref: 'l1',
        children: [{
          type: 'folder', name: 'L2', $ref: 'l2',
          children: [{ type: 'page', name: 'Deep', url: '/l1/l2/deep', $ref: 'deep.mdx', $id: 'deep' } as Node],
        } as unknown as Node],
      } as unknown as Node],
    }
    const result = compactTree(tree)
    const l1 = result.children[0] as any
    const l2 = l1.children[0] as any
    const deep = l2.children[0]
    expect(l1.$ref).toBeUndefined()
    expect(l2.$ref).toBeUndefined()
    expect(deep).toEqual({ type: 'page', name: 'Deep', url: '/l1/l2/deep' })
  })

  test('preserves tree name', () => {
    const tree: Root = { name: 'custom', children: [] }
    expect(compactTree(tree).name).toBe('custom')
  })

  // `short` is not a field fumadocs knows about, so it only survives
  // serialisation because it is named in KEEP_FIELDS.
  test('keeps short on page nodes', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'page', name: 'Space Packet Protocol', short: 'SPP',
        url: '/protocols/spp', $ref: 'spp.mdx',
      } as Node],
    }
    const result = compactTree(tree)
    expect(result.children[0]).toEqual({
      type: 'page', name: 'Space Packet Protocol', short: 'SPP', url: '/protocols/spp',
    } as Node)
  })

  test('keeps short on a folder index page', () => {
    const tree: Root = {
      name: 'root',
      children: [{
        type: 'folder', name: 'Transport',
        index: { type: 'page', name: 'Transport overview', short: 'TP', url: '/transport' } as Node,
        children: [],
      } as Node],
    }
    const folder = compactTree(tree).children[0] as any
    expect(folder.index.short).toBe('TP')
  })
})

describe('shortName', () => {
  test('returns the short label a page set', () => {
    const node = { type: 'page', name: 'Space Packet Protocol', short: 'SPP', url: '/spp' } as Node
    expect(shortName(node)).toBe('SPP')
  })

  test('returns undefined when a page set none, so callers fall back to title', () => {
    const node = { type: 'page', name: 'Install', url: '/install' } as Node
    expect(shortName(node)).toBeUndefined()
  })

  test('ignores an empty string', () => {
    const node = { type: 'page', name: 'Install', short: '', url: '/install' } as Node
    expect(shortName(node)).toBeUndefined()
  })

  test('ignores a non-string value', () => {
    const node = { type: 'page', name: 'Install', short: 42, url: '/install' } as unknown as Node
    expect(shortName(node)).toBeUndefined()
  })
})
