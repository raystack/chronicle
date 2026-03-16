import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RouterProvider, usePathname, Link } from '../router'

describe('router', () => {
  describe('RouterProvider', () => {
    it('provides initial pathname from initialUrl', () => {
      function ShowPathname() {
        const pathname = usePathname()
        return <span data-pathname={pathname}>{pathname}</span>
      }

      const html = renderToString(
        <RouterProvider initialUrl="http://localhost:3000/docs/intro">
          <ShowPathname />
        </RouterProvider>
      )
      expect(html).toContain('/docs/intro')
    })

    it('defaults to / when no initialUrl', () => {
      function ShowPathname() {
        const pathname = usePathname()
        return <span>{pathname}</span>
      }

      const html = renderToString(
        <RouterProvider>
          <ShowPathname />
        </RouterProvider>
      )
      expect(html).toContain('/')
    })
  })

  describe('Link', () => {
    it('renders an anchor tag with href', () => {
      const html = renderToString(
        <RouterProvider initialUrl="http://localhost:3000/">
          <Link href="/about">About</Link>
        </RouterProvider>
      )
      expect(html).toContain('href="/about"')
      expect(html).toContain('About')
    })

    it('renders with additional props', () => {
      const html = renderToString(
        <RouterProvider initialUrl="http://localhost:3000/">
          <Link href="/test" className="my-link">Test</Link>
        </RouterProvider>
      )
      expect(html).toContain('class="my-link"')
    })
  })
})
