import { describe, expect, test } from 'bun:test'
import { type ChronicleConfig, chronicleConfigSchema } from '@/types'
import { resolveRoute, RouteType } from './route-resolver'
import { LATEST_CONTEXT } from './version-source'

function singleContent(): ChronicleConfig {
  return chronicleConfigSchema.parse({
    site: { title: 'x' },
    content: [{ dir: 'docs', label: 'Docs' }],
  })
}

function multiContent(): ChronicleConfig {
  return chronicleConfigSchema.parse({
    site: { title: 'x' },
    content: [
      { dir: 'docs', label: 'Docs' },
      { dir: 'dev', label: 'Dev' },
    ],
    latest: { label: '3.0', landing: true },
  })
}

function multiContentNoLanding(): ChronicleConfig {
  return chronicleConfigSchema.parse({
    site: { title: 'x' },
    content: [
      { dir: 'docs', label: 'Docs' },
      { dir: 'dev', label: 'Dev' },
    ],
  })
}

function versioned(): ChronicleConfig {
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
        landing: true,
        content: [
          { dir: 'docs', label: 'Docs' },
          { dir: 'dev', label: 'Dev' },
        ],
      },
    ],
  })
}

describe('resolveRoute — root', () => {
  test('redirects single-content latest root to /<dir>', () => {
    expect(resolveRoute('/', singleContent())).toEqual({
      type: RouteType.Redirect,
      to: '/docs',
      status: 307,
    })
  })

  test('docs-index for latest root when latest.landing = true', () => {
    expect(resolveRoute('/', multiContent())).toEqual({
      type: RouteType.DocsIndex,
      version: LATEST_CONTEXT,
    })
  })

  test('redirect for multi-content latest root when landing is not set', () => {
    expect(resolveRoute('/', multiContentNoLanding())).toEqual({
      type: RouteType.Redirect,
      to: '/docs',
      status: 307,
    })
  })

  test('redirects single-content version root to /<v>/<dir>', () => {
    expect(resolveRoute('/v2', versioned())).toEqual({
      type: RouteType.Redirect,
      to: '/v2/docs',
      status: 307,
    })
  })

  test('docs-index for version root when versions[].landing = true', () => {
    expect(resolveRoute('/v1', versioned())).toEqual({
      type: RouteType.DocsIndex,
      version: { dir: 'v1', urlPrefix: '/v1' },
    })
  })
})

describe('resolveRoute — docs pages', () => {
  test('latest docs page returns full slug and latest context', () => {
    expect(resolveRoute('/docs/getting-started', singleContent())).toEqual({
      type: RouteType.DocsPage,
      version: LATEST_CONTEXT,
      slug: ['docs', 'getting-started'],
    })
  })

  test('versioned docs page returns full slug and version context', () => {
    expect(resolveRoute('/v1/dev/intro', versioned())).toEqual({
      type: RouteType.DocsPage,
      version: { dir: 'v1', urlPrefix: '/v1' },
      slug: ['v1', 'dev', 'intro'],
    })
  })

  test('unrecognized first segment stays latest (page lookup handles 404)', () => {
    expect(resolveRoute('/foo/bar', singleContent())).toEqual({
      type: RouteType.DocsPage,
      version: LATEST_CONTEXT,
      slug: ['foo', 'bar'],
    })
  })
})

describe('resolveRoute — APIs', () => {
  test('latest api index', () => {
    expect(resolveRoute('/apis', singleContent())).toEqual({
      type: RouteType.ApiIndex,
      version: LATEST_CONTEXT,
    })
  })

  test('latest api page', () => {
    expect(resolveRoute('/apis/petstore/getPetById', singleContent())).toEqual({
      type: RouteType.ApiPage,
      version: LATEST_CONTEXT,
      slug: ['petstore', 'getPetById'],
    })
  })

  test('versioned api index', () => {
    expect(resolveRoute('/v1/apis', versioned())).toEqual({
      type: RouteType.ApiIndex,
      version: { dir: 'v1', urlPrefix: '/v1' },
    })
  })

  test('versioned api page', () => {
    expect(
      resolveRoute('/v1/apis/petstore/getPetById', versioned()),
    ).toEqual({
      type: RouteType.ApiPage,
      version: { dir: 'v1', urlPrefix: '/v1' },
      slug: ['petstore', 'getPetById'],
    })
  })
})

describe('resolveRoute — edge cases', () => {
  test('trailing slash is normalized', () => {
    expect(resolveRoute('/v1/', versioned())).toEqual({
      type: RouteType.DocsIndex,
      version: { dir: 'v1', urlPrefix: '/v1' },
    })
  })

  test('version-shaped path without a matching version stays latest', () => {
    expect(resolveRoute('/v9/docs', versioned())).toEqual({
      type: RouteType.DocsPage,
      version: LATEST_CONTEXT,
      slug: ['v9', 'docs'],
    })
  })
})
