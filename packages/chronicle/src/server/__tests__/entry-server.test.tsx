import { describe, it, expect } from 'vitest'
import { render, type SSRData } from '../entry-server'

const mockData: SSRData = {
  config: { title: 'Test Site' },
  tree: { name: 'root', children: [] },
  page: {
    slug: [],
    frontmatter: { title: 'Test' },
    content: null,
  },
}

describe('entry-server', () => {
  it('exports a render function', () => {
    expect(typeof render).toBe('function')
  })

  it('returns an HTML string', () => {
    const html = render('http://localhost:3000/', mockData)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('renders docs route for root URL', () => {
    const html = render('http://localhost:3000/', mockData)
    expect(html).toBeTruthy()
  })

  it('renders api route for /apis URL', () => {
    const html = render('http://localhost:3000/apis', mockData)
    expect(html).toBeTruthy()
  })
})
