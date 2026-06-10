import { describe, expect, test } from 'bun:test'
import { toEndpoint } from './telemetry'

describe('toEndpoint', () => {
  test('root path', () => {
    expect(toEndpoint('/')).toBe('/')
  })

  test('docs pages map to /docs/:slug', () => {
    expect(toEndpoint('/docs/intro')).toBe('/docs/:slug')
    expect(toEndpoint('/docs/guides/installation')).toBe('/docs/:slug')
    expect(toEndpoint('/developer/gettingstarted/auth')).toBe('/docs/:slug')
  })

  test('api internal routes keep exact path', () => {
    expect(toEndpoint('/api/page')).toBe('/api/page')
    expect(toEndpoint('/api/search')).toBe('/api/search')
    expect(toEndpoint('/api/specs')).toBe('/api/specs')
    expect(toEndpoint('/api/health')).toBe('/api/health')
  })

  test('api reference pages map to /apis/:slug', () => {
    expect(toEndpoint('/apis/petstore/listPets')).toBe('/apis/:slug')
    expect(toEndpoint('/apis/frontier/getUser')).toBe('/apis/:slug')
  })

  test('assets map to /assets/:file', () => {
    expect(toEndpoint('/assets/chunk-abc123.js')).toBe('/assets/:file')
    expect(toEndpoint('/assets/style-xyz.css')).toBe('/assets/:file')
  })

  test('content paths map to /_content/:path', () => {
    expect(toEndpoint('/_content/docs/intro.mdx')).toBe('/_content/:path')
  })

  test('static routes keep exact path', () => {
    expect(toEndpoint('/llms.txt')).toBe('/llms.txt')
    expect(toEndpoint('/robots.txt')).toBe('/robots.txt')
    expect(toEndpoint('/sitemap.xml')).toBe('/sitemap.xml')
    expect(toEndpoint('/og')).toBe('/og')
  })

  test('versioned docs map to /docs/:slug', () => {
    expect(toEndpoint('/v1/docs/intro')).toBe('/docs/:slug')
    expect(toEndpoint('/v2/guides/setup')).toBe('/docs/:slug')
  })

  test('bare docs root paths map to /docs/:slug', () => {
    expect(toEndpoint('/docs')).toBe('/docs/:slug')
    expect(toEndpoint('/developer')).toBe('/docs/:slug')
    expect(toEndpoint('/v1')).toBe('/docs/:slug')
  })

  test('scanner/unmatched routes return null', () => {
    expect(toEndpoint('/.env')).toBeNull()
    expect(toEndpoint('/.aws/credentials')).toBeNull()
    expect(toEndpoint('/wp-config.bak')).toBeNull()
    expect(toEndpoint('/$(pwd)/.git/config')).toBeNull()
    expect(toEndpoint('/.circleci/context/secrets.yml')).toBeNull()
    expect(toEndpoint('/application.properties')).toBeNull()
  })
})
