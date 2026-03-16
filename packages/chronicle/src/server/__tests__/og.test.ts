import { describe, it, expect } from 'vitest'
import { handleOg } from '../handlers/og'

// OG handler requires network to fetch fonts, skip in CI-like environments
describe.skipIf(!process.env.TEST_OG)('handleOg', () => {
  it('returns SVG content type', async () => {
    const req = new Request('http://localhost:3000/og?title=Test')
    const response = await handleOg(req)
    expect(response.headers.get('content-type')).toBe('image/svg+xml')
  })

  it('returns cache-control header', async () => {
    const req = new Request('http://localhost:3000/og?title=Test')
    const response = await handleOg(req)
    expect(response.headers.get('cache-control')).toContain('max-age')
  })
})

describe('handleOg export', () => {
  it('exports a function', () => {
    expect(typeof handleOg).toBe('function')
  })
})
