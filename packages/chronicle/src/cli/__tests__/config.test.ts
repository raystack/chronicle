import { describe, it, expect } from 'vitest'
import { resolveContentDir } from '../utils/config'

describe('resolveContentDir', () => {
  it('returns flag value when provided', () => {
    const result = resolveContentDir('/custom/path')
    expect(result).toBe('/custom/path')
  })

  it('returns env var when set', () => {
    const original = process.env.CHRONICLE_CONTENT_DIR
    process.env.CHRONICLE_CONTENT_DIR = '/env/content'
    const result = resolveContentDir()
    expect(result).toContain('env/content')
    process.env.CHRONICLE_CONTENT_DIR = original
  })

  it('defaults to content directory', () => {
    const original = process.env.CHRONICLE_CONTENT_DIR
    delete process.env.CHRONICLE_CONTENT_DIR
    const result = resolveContentDir()
    expect(result).toContain('content')
    process.env.CHRONICLE_CONTENT_DIR = original
  })
})
