import { describe, it, expect } from 'vitest'
import { matchRoute } from '../router'

describe('router', () => {
  it('matches /api/health route', () => {
    const handler = matchRoute('http://localhost:3000/api/health')
    expect(handler).not.toBeNull()
  })

  it('returns ok for /api/health', async () => {
    const handler = matchRoute('http://localhost:3000/api/health')
    const response = await handler!(new Request('http://localhost:3000/api/health'))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
  })

  it('matches /api/search route', () => {
    const handler = matchRoute('http://localhost:3000/api/search')
    expect(handler).not.toBeNull()
  })

  it('returns JSON array for /api/search', async () => {
    const handler = matchRoute('http://localhost:3000/api/search')
    const response = await handler!(new Request('http://localhost:3000/api/search'))
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual([])
  })

  it('matches /robots.txt route', async () => {
    const handler = matchRoute('http://localhost:3000/robots.txt')
    expect(handler).not.toBeNull()
    const response = await handler!(new Request('http://localhost:3000/robots.txt'))
    expect(response.headers.get('content-type')).toBe('text/plain')
    const text = await response.text()
    expect(text).toContain('User-agent')
  })

  it('matches /sitemap.xml route', async () => {
    const handler = matchRoute('http://localhost:3000/sitemap.xml')
    expect(handler).not.toBeNull()
    const response = await handler!(new Request('http://localhost:3000/sitemap.xml'))
    expect(response.headers.get('content-type')).toBe('application/xml')
  })

  it('returns null for unknown routes', () => {
    const handler = matchRoute('http://localhost:3000/some/random/path')
    expect(handler).toBeNull()
  })

  it('matches /llms.txt route', async () => {
    const handler = matchRoute('http://localhost:3000/llms.txt')
    expect(handler).not.toBeNull()
    const response = await handler!(new Request('http://localhost:3000/llms.txt'))
    expect(response.headers.get('content-type')).toBe('text/plain')
  })
})
