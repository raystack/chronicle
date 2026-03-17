import { describe, it, expect } from 'vitest'
import { handleHealth } from '../handlers/health'
import { handleRobots } from '../handlers/robots'
import { handleSitemap } from '../handlers/sitemap'
import { handleApisProxy } from '../handlers/apis-proxy'
import { handleLlms } from '../handlers/llms'

describe('handleHealth', () => {
  it('returns 200 with status ok', async () => {
    const response = handleHealth()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

describe('handleRobots', () => {
  it('returns text/plain content type', async () => {
    const response = handleRobots()
    expect(response.headers.get('content-type')).toBe('text/plain')
  })

  it('includes User-agent directive', async () => {
    const response = handleRobots()
    const text = await response.text()
    expect(text).toContain('User-agent: *')
    expect(text).toContain('Allow: /')
  })
})

describe('handleSitemap', () => {
  it('returns application/xml content type', async () => {
    const response = await handleSitemap()
    expect(response.headers.get('content-type')).toBe('application/xml')
  })

  it('returns valid XML structure', async () => {
    const response = await handleSitemap()
    const xml = await response.text()
    expect(xml).toContain('<urlset')
  })
})

describe('handleApisProxy', () => {
  it('returns 405 for GET requests', async () => {
    const req = new Request('http://localhost:3000/api/apis-proxy', { method: 'GET' })
    const response = await handleApisProxy(req)
    expect(response.status).toBe(405)
  })

  it('returns 400 for POST without required fields', async () => {
    const req = new Request('http://localhost:3000/api/apis-proxy', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await handleApisProxy(req)
    expect(response.status).toBe(400)
  })

  it('returns 404 for unknown spec', async () => {
    const req = new Request('http://localhost:3000/api/apis-proxy', {
      method: 'POST',
      body: JSON.stringify({ specName: 'nonexistent', method: 'GET', path: '/test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await handleApisProxy(req)
    expect(response.status).toBe(404)
  })
})

describe('handleLlms', () => {
  it('returns 404 when llms not enabled', async () => {
    const response = await handleLlms()
    expect(response.status).toBe(404)
  })
})
