import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Head } from '@/lib/head'

describe('Head component', () => {
  const baseConfig = {
    title: 'Test Docs',
    theme: { name: 'default' as const },
    search: { enabled: true, placeholder: 'Search...' },
  }

  it('renders title tag', () => {
    const html = renderToString(
      <Head title="Page Title" config={baseConfig} />
    )
    expect(html).toContain('Page Title | Test Docs')
  })

  it('renders description meta tag', () => {
    const html = renderToString(
      <Head title="Page" description="A description" config={baseConfig} />
    )
    expect(html).toContain('A description')
  })

  it('renders OG tags when config.url is set', () => {
    const html = renderToString(
      <Head
        title="Page"
        description="Desc"
        config={{ ...baseConfig, url: 'https://docs.example.com' }}
      />
    )
    expect(html).toContain('og:title')
    expect(html).toContain('og:description')
    expect(html).toContain('twitter:card')
  })

  it('skips OG tags when no url in config', () => {
    const html = renderToString(
      <Head title="Page" config={baseConfig} />
    )
    expect(html).not.toContain('og:title')
  })

  it('renders JSON-LD script', () => {
    const html = renderToString(
      <Head
        title="Page"
        config={baseConfig}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'Article' }}
      />
    )
    expect(html).toContain('application/ld+json')
    expect(html).toContain('schema.org')
  })
})
