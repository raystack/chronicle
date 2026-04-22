import { describe, expect, test } from 'bun:test'
import { chronicleConfigSchema } from '@/types'
import { buildLlmsTxt } from './llms'
import { LATEST_CONTEXT } from './version-source'

describe('buildLlmsTxt', () => {
  test('uses site.title and appends latest label when set', () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'My Docs' },
      content: [{ dir: 'docs', label: 'Docs' }],
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [{ dir: 'docs', label: 'Docs' }],
        },
      ],
    })

    const out = buildLlmsTxt(
      config,
      [
        { url: '/docs/a', title: 'A' },
        { url: '/', title: 'Home' },
      ],
      LATEST_CONTEXT,
    )

    expect(out).toContain('# My Docs — 3.0')
    expect(out).toContain('- [A](/docs/a.md)')
    expect(out).toContain('- [Home](/index.md)')
  })

  test('heading has no version label when latest is absent and ctx is latest', () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'My Docs' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    const out = buildLlmsTxt(config, [], LATEST_CONTEXT)
    expect(out.startsWith('# My Docs\n')).toBe(true)
  })

  test('falls back to page url when title is missing or empty', () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'Docs' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    const out = buildLlmsTxt(
      config,
      [
        { url: '/docs/untitled' },
        { url: '/docs/blank', title: '   ' },
      ],
      LATEST_CONTEXT,
    )
    expect(out).toContain('- [/docs/untitled](/docs/untitled.md)')
    expect(out).toContain('- [/docs/blank](/docs/blank.md)')
  })

  test('omits the description line when description is empty', () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'Docs' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    const out = buildLlmsTxt(config, [{ url: '/a', title: 'A' }], LATEST_CONTEXT)
    // heading immediately followed by a single blank line then the index
    expect(out).toBe('# Docs\n\n- [A](/a.md)')
  })

  test('uses the version label for a versioned ctx', () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'My Docs' },
      content: [{ dir: 'docs', label: 'Docs' }],
      latest: { label: '3.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [{ dir: 'docs', label: 'Docs' }],
        },
      ],
    })

    const out = buildLlmsTxt(
      config,
      [{ url: '/v1/docs/a', title: 'A' }],
      { dir: 'v1', urlPrefix: '/v1' },
    )
    expect(out).toContain('# My Docs — 1.0')
    expect(out).toContain('- [A](/v1/docs/a.md)')
  })
})
