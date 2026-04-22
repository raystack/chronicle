import { describe, expect, test } from 'bun:test'
import { type ChronicleConfig, chronicleConfigSchema } from '@/types'
import {
  getActiveContentDir,
  getVersionHomeHref,
  splitContentButtons,
} from './navigation'

function versioned(): ChronicleConfig {
  return chronicleConfigSchema.parse({
    site: { title: 'x' },
    content: [
      { dir: 'docs', label: 'Docs' },
      { dir: 'dev', label: 'Dev' },
    ],
    latest: { label: '3.0' },
    versions: [
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

describe('getActiveContentDir', () => {
  test('returns latest content dir from URL', () => {
    expect(getActiveContentDir('/docs/intro', versioned())).toBe('docs')
    expect(getActiveContentDir('/dev/setup', versioned())).toBe('dev')
  })

  test('returns versioned content dir from URL', () => {
    expect(getActiveContentDir('/v1/docs/intro', versioned())).toBe('docs')
    expect(getActiveContentDir('/v1/dev/setup', versioned())).toBe('dev')
  })

  test('returns null for root and api routes', () => {
    expect(getActiveContentDir('/', versioned())).toBeNull()
    expect(getActiveContentDir('/v1', versioned())).toBeNull()
    expect(getActiveContentDir('/apis/x', versioned())).toBeNull()
    expect(getActiveContentDir('/v1/apis/x', versioned())).toBeNull()
  })

  test('returns null for unknown content dir', () => {
    expect(getActiveContentDir('/random', versioned())).toBeNull()
    expect(getActiveContentDir('/v1/random', versioned())).toBeNull()
  })
})

describe('getVersionHomeHref', () => {
  test('single content dir returns /<dir>', () => {
    const cfg = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    expect(getVersionHomeHref(cfg, null)).toBe('/docs')
  })

  test('multi content dir returns / (version root for landing)', () => {
    expect(getVersionHomeHref(versioned(), null)).toBe('/')
  })

  test('versioned multi content returns /<v>', () => {
    expect(getVersionHomeHref(versioned(), 'v1')).toBe('/v1')
  })

  test('unknown version returns /<v> fallback', () => {
    expect(getVersionHomeHref(versioned(), 'v9')).toBe('/v9')
  })
})

describe('splitContentButtons', () => {
  test('all visible when length <= max', () => {
    expect(splitContentButtons([1, 2, 3], 3)).toEqual({
      visible: [1, 2, 3],
      overflow: [],
    })
  })

  test('first max visible, rest overflow', () => {
    expect(splitContentButtons([1, 2, 3, 4, 5], 3)).toEqual({
      visible: [1, 2, 3],
      overflow: [4, 5],
    })
  })

  test('empty input returns empty arrays', () => {
    expect(splitContentButtons([], 3)).toEqual({ visible: [], overflow: [] })
  })
})
