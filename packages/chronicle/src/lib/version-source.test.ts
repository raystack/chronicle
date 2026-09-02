import { describe, expect, test } from 'bun:test'
import type { Folder, Item, Root } from 'fumadocs-core/page-tree'
import { type ChronicleConfig, chronicleConfigSchema } from '@/types'
import {
  filterPagesByVersion,
  filterPageTreeByContentDir,
  filterPageTreeByVersion,
  LATEST_CONTEXT,
  resolveVersionFromUrl,
} from './version-source'

function makeConfig(): ChronicleConfig {
  return chronicleConfigSchema.parse({
    site: { title: 'x' },
    content: [{ dir: 'docs', label: 'Docs' }],
    latest: { label: '3.0' },
    versions: [
      {
        dir: 'v2',
        label: '2.0',
        content: [{ dir: 'docs', label: 'Docs' }],
      },
      {
        dir: 'v1',
        label: '1.0',
        content: [
          { dir: 'docs', label: 'Docs' },
          { dir: 'dev', label: 'Dev' },
        ],
      },
    ],
  })
}

function page(url: string): Item {
  return { type: 'page', name: url, url }
}

function folder(name: string, children: (Item | Folder)[]): Folder {
  return { type: 'folder', name, children }
}

describe('resolveVersionFromUrl', () => {
  const config = makeConfig()

  test('returns latest context for unprefixed URLs', () => {
    expect(resolveVersionFromUrl('/docs/getting-started', config)).toEqual(
      LATEST_CONTEXT,
    )
    expect(resolveVersionFromUrl('/', config)).toEqual(LATEST_CONTEXT)
  })

  test('returns version context when URL matches a version prefix', () => {
    expect(resolveVersionFromUrl('/v1/docs/intro', config)).toEqual({
      dir: 'v1',
      urlPrefix: '/v1',
    })
    expect(resolveVersionFromUrl('/v2', config)).toEqual({
      dir: 'v2',
      urlPrefix: '/v2',
    })
  })

  test('does not match a version when prefix is only a substring', () => {
    expect(resolveVersionFromUrl('/v1beta/docs', config)).toEqual(LATEST_CONTEXT)
  })
})

describe('filterPagesByVersion', () => {
  const config = makeConfig()
  const pages = [
    { url: '/docs/a' },
    { url: '/docs/b' },
    { url: '/v1/docs/a' },
    { url: '/v1/dev/b' },
    { url: '/v2/docs/a' },
  ]

  test('latest excludes all versioned pages', () => {
    expect(filterPagesByVersion(pages, LATEST_CONTEXT, config)).toEqual([
      { url: '/docs/a' },
      { url: '/docs/b' },
    ])
  })

  test('version returns only pages under its prefix', () => {
    expect(
      filterPagesByVersion(pages, { dir: 'v1', urlPrefix: '/v1' }, config),
    ).toEqual([{ url: '/v1/docs/a' }, { url: '/v1/dev/b' }])
  })
})

describe('filterPageTreeByVersion', () => {
  const config = makeConfig()
  const latestDocs = folder('docs', [page('/docs/a'), page('/docs/b')])
  const v1Folder = folder('v1', [
    folder('docs', [page('/v1/docs/a')]),
    folder('dev', [page('/v1/dev/a')]),
  ])
  const v2Folder = folder('v2', [folder('docs', [page('/v2/docs/a')])])

  const tree: Root = {
    name: 'root',
    children: [latestDocs, v1Folder, v2Folder],
  }

  test('latest drops version folders', () => {
    const filtered = filterPageTreeByVersion(tree, LATEST_CONTEXT, config)
    expect(filtered.children).toEqual([latestDocs])
  })

  test('version returns the inner children of its folder', () => {
    const filtered = filterPageTreeByVersion(
      tree,
      { dir: 'v1', urlPrefix: '/v1' },
      config,
    )
    expect(filtered.children).toEqual(v1Folder.children)
  })

  test('version returns empty children when the version folder is absent', () => {
    const filtered = filterPageTreeByVersion(
      { name: 'root', children: [latestDocs] },
      { dir: 'v1', urlPrefix: '/v1' },
      config,
    )
    expect(filtered.children).toEqual([])
  })

  test('leaves an already scoped tree alone', () => {
    // `entry-server` scopes the tree before serialising it, and then a layout
    // scopes what it is handed. The second pass used to mistake v1's first
    // content folder for the version folder and drop the rest.
    const scoped: Root = { name: 'root', children: v1Folder.children }
    const filtered = filterPageTreeByVersion(
      scoped,
      { dir: 'v1', urlPrefix: '/v1' },
      config,
    )
    expect(filtered.children).toEqual(v1Folder.children)
  })
})

describe('filterPageTreeByContentDir', () => {
  const latestDocs = folder('docs', [page('/docs/a'), page('/docs/b')])
  const latestDev = folder('dev', [page('/dev/x')])
  const latestTree: Root = {
    name: 'root',
    children: [latestDocs, latestDev],
  }

  test('null contentDir returns tree unchanged', () => {
    const out = filterPageTreeByContentDir(latestTree, LATEST_CONTEXT, null)
    expect(out).toBe(latestTree)
  })

  test('returns just the matching content folder children (latest)', () => {
    const out = filterPageTreeByContentDir(latestTree, LATEST_CONTEXT, 'docs')
    expect(out.children).toEqual(latestDocs.children)
  })

  test('returns empty children when content dir is absent', () => {
    const out = filterPageTreeByContentDir(latestTree, LATEST_CONTEXT, 'missing')
    expect(out.children).toEqual([])
  })

  test('uses version urlPrefix to disambiguate within a version', () => {
    const v1Docs = folder('docs', [page('/v1/docs/a')])
    const v1Dev = folder('dev', [page('/v1/dev/x')])
    const ctx = { dir: 'v1', urlPrefix: '/v1' }
    const tree: Root = { name: 'root', children: [v1Docs, v1Dev] }
    expect(
      filterPageTreeByContentDir(tree, ctx, 'dev').children,
    ).toEqual(v1Dev.children)
  })

  test('unwraps the content-dir folder on a single-content-dir site', () => {
    // The whole tree is under /docs here, so an "every url matches the prefix"
    // test would call it already scoped and leave the wrapper in place — its
    // label then shows as a heading above every page in the sidebar.
    const wrapped: Root = {
      name: 'root',
      children: [
        {
          type: 'folder',
          name: 'Docs',
          index: page('/docs'),
          children: [page('/docs/a'), page('/docs/b')],
        } as Folder,
      ],
    }
    const out = filterPageTreeByContentDir(wrapped, LATEST_CONTEXT, 'docs')
    expect(out.children).toEqual([page('/docs/a'), page('/docs/b')])
  })

  test('does not mistake a sub-folder for the content dir', () => {
    // Already scoped, and its only child is a folder. `guides` sits at
    // /docs/guides, not /docs, so it is not the wrapper.
    const scoped: Root = {
      name: 'root',
      children: [folder('guides', [page('/docs/guides/a'), page('/docs/guides/b')])],
    }
    const out = filterPageTreeByContentDir(scoped, LATEST_CONTEXT, 'docs')
    expect(out.children).toEqual(scoped.children)
  })

  test('leaves an already scoped flat tree alone', () => {
    // A single content directory with no sub-folders: after `entry-server`
    // scopes it the children are the pages themselves, and looking for a
    // wrapping folder again found none and emptied the navigation.
    const scoped: Root = { name: 'root', children: latestDocs.children }
    const out = filterPageTreeByContentDir(scoped, LATEST_CONTEXT, 'docs')
    expect(out.children).toEqual(latestDocs.children)
  })

  test('leaves an already scoped tree with sub-folders alone', () => {
    // Same tree, but with sub-folders: the second pass used to match the first
    // sub-folder — every url in it is under `/docs` — and show only its pages.
    const scoped: Root = {
      name: 'root',
      children: [page('/docs'), folder('guides', [page('/docs/guides/a')])],
    }
    const out = filterPageTreeByContentDir(scoped, LATEST_CONTEXT, 'docs')
    expect(out.children).toEqual(scoped.children)
  })
})
