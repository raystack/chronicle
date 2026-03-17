import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PageProvider } from '@/lib/page-context'
import { App } from './App'
import { getPage, loadPageComponent, buildPageTree } from '@/lib/source'
import { mdxComponents } from '@/components/mdx'
import type { ChronicleConfig, PageTree } from '@/types'
import type { ApiSpec } from '@/lib/openapi'
import type { ReactNode } from 'react'
import React from 'react'

interface EmbeddedData {
  config: ChronicleConfig
  tree: PageTree
  slug: string[]
  frontmatter: { title: string; description?: string; order?: number }
  filePath: string
}

async function hydrate() {
  try {
    const embedded: EmbeddedData | undefined = (window as any).__PAGE_DATA__

    let config: ChronicleConfig = { title: 'Documentation' }
    let tree: PageTree = { name: 'root', children: [] }
    let page: { slug: string[]; frontmatter: any; content: ReactNode } | null = null
    let apiSpecs: ApiSpec[] = []

    if (embedded) {
      config = embedded.config
      tree = embedded.tree

      // Fetch API specs if on /apis route
      const isApiRoute = window.location.pathname.startsWith('/apis')
      if (isApiRoute && config.api?.length) {
        try {
          const res = await fetch('/api/specs')
          apiSpecs = await res.json()
        } catch { /* will load on demand */ }
      }

      const sourcePage = await getPage(embedded.slug)
      if (sourcePage) {
        const component = await loadPageComponent(sourcePage)
        page = {
          slug: embedded.slug,
          frontmatter: embedded.frontmatter,
          content: component ? React.createElement(component, { components: mdxComponents }) : null,
        }
      } else {
        page = {
          slug: embedded.slug,
          frontmatter: embedded.frontmatter,
          content: null,
        }
      }
    } else {
      tree = await buildPageTree()
    }

    hydrateRoot(
      document.getElementById('root') as HTMLElement,
      <BrowserRouter>
        <PageProvider initialConfig={config} initialTree={tree} initialPage={page} initialApiSpecs={apiSpecs}>
          <App />
        </PageProvider>
      </BrowserRouter>,
    )
  } catch (err) {
    console.error('Hydration failed:', err)
  }
}

hydrate()
