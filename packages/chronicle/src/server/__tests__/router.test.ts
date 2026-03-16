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
    const body = await response.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('matches /api/search route', () => {
    const handler = matchRoute('http://localhost:3000/api/search')
    expect(handler).not.toBeNull()
  })

  it('matches /robots.txt route', () => {
    const handler = matchRoute('http://localhost:3000/robots.txt')
    expect(handler).not.toBeNull()
  })

  it('returns robots.txt with correct content', async () => {
    const handler = matchRoute('http://localhost:3000/robots.txt')
    const response = await handler!(new Request('http://localhost:3000/robots.txt'))
    expect(response.headers.get('content-type')).toBe('text/plain')
    const text = await response.text()
    expect(text).toContain('User-agent')
  })

  it('matches /sitemap.xml route', () => {
    const handler = matchRoute('http://localhost:3000/sitemap.xml')
    expect(handler).not.toBeNull()
  })

  it('returns sitemap.xml with xml content type', async () => {
    const handler = matchRoute('http://localhost:3000/sitemap.xml')
    const response = await handler!(new Request('http://localhost:3000/sitemap.xml'))
    expect(response.headers.get('content-type')).toBe('application/xml')
  })

  it('returns null for unknown routes', () => {
    const handler = matchRoute('http://localhost:3000/some/random/path')
    expect(handler).toBeNull()
  })

  it('matches /llms.txt route', () => {
    const handler = matchRoute('http://localhost:3000/llms.txt')
    expect(handler).not.toBeNull()
  })

  it('matches /og route', () => {
    const handler = matchRoute('http://localhost:3000/og')
    expect(handler).not.toBeNull()
  })

  it('matches /api/apis-proxy route', () => {
    const handler = matchRoute('http://localhost:3000/api/apis-proxy')
    expect(handler).not.toBeNull()
  })

  it('returns 405 for non-POST to apis-proxy', async () => {
    const handler = matchRoute('http://localhost:3000/api/apis-proxy')
    const response = await handler!(new Request('http://localhost:3000/api/apis-proxy'))
    expect(response.status).toBe(405)
  })
})
