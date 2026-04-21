import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chronicleConfigSchema } from '@/types'
import {
  getAllVersions,
  getApiConfigsForVersion,
  getLandingEntries,
  getLatestContentRoots,
  getVersionContentRoots,
  loadConfig,
} from './config'

type GlobalWithRaw = typeof globalThis & {
  __CHRONICLE_CONFIG_RAW__?: string | null
}

const g = globalThis as GlobalWithRaw

const minimal = {
  site: { title: 'My Docs' },
  content: [{ dir: 'docs', label: 'Docs' }],
}

describe('chronicleConfigSchema', () => {
  test('parses minimal single-content config', () => {
    const parsed = chronicleConfigSchema.parse(minimal)
    expect(parsed.site.title).toBe('My Docs')
    expect(parsed.content).toEqual([{ dir: 'docs', label: 'Docs' }])
  })

  test('parses multi-content config', () => {
    const parsed = chronicleConfigSchema.parse({
      ...minimal,
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev Docs' },
      ],
    })
    expect(parsed.content).toHaveLength(2)
  })

  test('parses versioned config with badge and defaults variant to accent', () => {
    const parsed = chronicleConfigSchema.parse({
      ...minimal,
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          badge: { label: 'deprecated' },
          content: [{ dir: 'docs', label: 'Docs' }],
        },
      ],
    })
    expect(parsed.versions?.[0].badge).toEqual({
      label: 'deprecated',
      variant: 'accent',
    })
  })

  test('accepts explicit badge variant', () => {
    const parsed = chronicleConfigSchema.parse({
      ...minimal,
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          badge: { label: 'deprecated', variant: 'warning' },
          content: [{ dir: 'docs', label: 'Docs' }],
        },
      ],
    })
    expect(parsed.versions?.[0].badge?.variant).toBe('warning')
  })

  test('rejects unknown top-level field (legacy title)', () => {
    expect(() =>
      chronicleConfigSchema.parse({ ...minimal, title: 'My Docs' }),
    ).toThrow()
  })

  test('rejects string form of content', () => {
    expect(() =>
      chronicleConfigSchema.parse({ site: { title: 'x' }, content: '.' }),
    ).toThrow()
  })

  test('rejects empty content array', () => {
    expect(() =>
      chronicleConfigSchema.parse({ site: { title: 'x' }, content: [] }),
    ).toThrow()
  })

  test('rejects "." or ".." or path-shaped content dir names', () => {
    for (const dir of ['.', '..', 'foo/bar', 'foo\\bar']) {
      expect(() =>
        chronicleConfigSchema.parse({
          site: { title: 'x' },
          content: [{ dir, label: 'Docs' }],
        }),
      ).toThrow(/simple folder name/)
    }
  })

  test('rejects "." or ".." version dir', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        site: { title: 'x' },
        content: [{ dir: 'docs', label: 'Docs' }],
        latest: { label: '2.0' },
        versions: [
          {
            dir: '.',
            label: '1.0',
            content: [{ dir: 'docs', label: 'Docs' }],
          },
        ],
      }),
    ).toThrow(/simple folder name/)
  })

  test('rejects versions without latest', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        ...minimal,
        versions: [
          {
            dir: 'v1',
            label: '1.0',
            content: [{ dir: 'docs', label: 'Docs' }],
          },
        ],
      }),
    ).toThrow(/latest is required/)
  })

  test('rejects duplicate content[].dir', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        ...minimal,
        content: [
          { dir: 'docs', label: 'A' },
          { dir: 'docs', label: 'B' },
        ],
      }),
    ).toThrow(/content\[\]\.dir must be unique/)
  })

  test('rejects duplicate versions[].dir', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        ...minimal,
        latest: { label: '3.0' },
        versions: [
          { dir: 'v1', label: '1', content: [{ dir: 'docs', label: 'd' }] },
          { dir: 'v1', label: '1b', content: [{ dir: 'docs', label: 'd' }] },
        ],
      }),
    ).toThrow(/versions\[\]\.dir must be unique/)
  })

  test('rejects duplicate content dirs within a version', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        ...minimal,
        latest: { label: '3.0' },
        versions: [
          {
            dir: 'v1',
            label: '1',
            content: [
              { dir: 'docs', label: 'A' },
              { dir: 'docs', label: 'B' },
            ],
          },
        ],
      }),
    ).toThrow(/unique within each version/)
  })

  test('rejects invalid badge variant', () => {
    expect(() =>
      chronicleConfigSchema.parse({
        ...minimal,
        latest: { label: '3.0' },
        versions: [
          {
            dir: 'v1',
            label: '1',
            badge: { label: 'x', variant: 'info' },
            content: [{ dir: 'docs', label: 'd' }],
          },
        ],
      }),
    ).toThrow()
  })
})

describe('getLatestContentRoots', () => {
  test('maps each content entry to content/<dir>', () => {
    const cfg = chronicleConfigSchema.parse({
      ...minimal,
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev Docs' },
      ],
    })
    const roots = getLatestContentRoots(cfg)
    expect(roots).toEqual([
      {
        versionDir: null,
        versionLabel: null,
        contentDir: 'docs',
        contentLabel: 'Docs',
        fsPath: 'content/docs',
        urlPrefix: '/docs',
      },
      {
        versionDir: null,
        versionLabel: null,
        contentDir: 'dev',
        contentLabel: 'Dev Docs',
        fsPath: 'content/dev',
        urlPrefix: '/dev',
      },
    ])
  })

  test('includes versionLabel when latest is set', () => {
    const cfg = chronicleConfigSchema.parse({
      ...minimal,
      latest: { label: '3.0' },
    })
    expect(getLatestContentRoots(cfg)[0].versionLabel).toBe('3.0')
  })
})

describe('getVersionContentRoots', () => {
  test('resolves versions/<v>/<dir> and preserves config order', () => {
    const cfg = chronicleConfigSchema.parse({
      ...minimal,
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [
            { dir: 'dev', label: 'Developer Guide' },
            { dir: 'docs', label: 'Docs' },
          ],
        },
      ],
    })
    const roots = getVersionContentRoots(cfg, 'v1')
    expect(roots.map((r) => r.fsPath)).toEqual([
      'versions/v1/dev',
      'versions/v1/docs',
    ])
    expect(roots.map((r) => r.urlPrefix)).toEqual(['/v1/dev', '/v1/docs'])
    expect(roots[0].contentLabel).toBe('Developer Guide')
  })

  test('returns empty array for unknown version', () => {
    const cfg = chronicleConfigSchema.parse(minimal)
    expect(getVersionContentRoots(cfg, 'v1')).toEqual([])
  })
})

describe('getAllVersions', () => {
  test('returns latest first then versions in config order', () => {
    const cfg = chronicleConfigSchema.parse({
      ...minimal,
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
          badge: { label: 'deprecated', variant: 'warning' },
          content: [{ dir: 'docs', label: 'Docs' }],
        },
      ],
    })
    const all = getAllVersions(cfg)
    expect(all).toEqual([
      { dir: null, label: '3.0', isLatest: true },
      { dir: 'v2', label: '2.0', isLatest: false },
      {
        dir: 'v1',
        label: '1.0',
        badge: { label: 'deprecated', variant: 'warning' },
        isLatest: false,
      },
    ])
  })

  test('returns empty when no latest and no versions', () => {
    const cfg = chronicleConfigSchema.parse(minimal)
    expect(getAllVersions(cfg)).toEqual([])
  })
})

describe('getLandingEntries', () => {
  test('returns labels + unprefixed hrefs for latest', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev' },
      ],
    })
    expect(getLandingEntries(cfg, null)).toEqual([
      { label: 'Docs', href: '/docs', contentDir: 'docs' },
      { label: 'Dev', href: '/dev', contentDir: 'dev' },
    ])
  })

  test('returns versioned hrefs for a version', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [
            { dir: 'dev', label: 'Developer Guide' },
            { dir: 'docs', label: 'Docs' },
          ],
        },
      ],
    })
    expect(getLandingEntries(cfg, 'v1')).toEqual([
      { label: 'Developer Guide', href: '/v1/dev', contentDir: 'dev' },
      { label: 'Docs', href: '/v1/docs', contentDir: 'docs' },
    ])
  })

  test('returns empty array for unknown version', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    expect(getLandingEntries(cfg, 'v9')).toEqual([])
  })
})

describe('getApiConfigsForVersion', () => {
  const apiFixture = {
    name: 'Petstore',
    spec: './petstore.json',
    basePath: '/apis',
    server: { url: 'https://petstore.example.com' },
  }

  test('returns config.api for latest (null)', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
      api: [apiFixture],
    })
    expect(getApiConfigsForVersion(cfg, null)).toEqual([apiFixture])
  })

  test('returns versions[].api for a matching version', () => {
    const versionedApi = { ...apiFixture, spec: './v1-petstore.json' }
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [{ dir: 'docs', label: 'Docs' }],
          api: [versionedApi],
        },
      ],
    })
    expect(getApiConfigsForVersion(cfg, 'v1')).toEqual([versionedApi])
  })

  test('returns [] for unknown version or missing api', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    expect(getApiConfigsForVersion(cfg, 'v9')).toEqual([])
    expect(getApiConfigsForVersion(cfg, null)).toEqual([])
  })
})

describe('loadConfig', () => {
  beforeEach(() => {
    delete g.__CHRONICLE_CONFIG_RAW__
  })

  afterEach(() => {
    delete g.__CHRONICLE_CONFIG_RAW__
  })

  test('returns default config when raw is undefined', () => {
    const cfg = loadConfig()
    expect(cfg.site.title).toBe('Documentation')
    expect(cfg.content).toEqual([{ dir: 'docs', label: 'Docs' }])
  })

  test('returns default config when raw is null', () => {
    g.__CHRONICLE_CONFIG_RAW__ = null
    const cfg = loadConfig()
    expect(cfg.site.title).toBe('Documentation')
  })

  test('parses yaml raw string', () => {
    g.__CHRONICLE_CONFIG_RAW__ = `
site:
  title: Yaml Docs
content:
  - dir: docs
    label: Docs
  - dir: dev
    label: Dev
`
    const cfg = loadConfig()
    expect(cfg.site.title).toBe('Yaml Docs')
    expect(cfg.content).toHaveLength(2)
  })

  test('throws on invalid yaml config', () => {
    g.__CHRONICLE_CONFIG_RAW__ = 'title: Legacy'
    expect(() => loadConfig()).toThrow()
  })
})
