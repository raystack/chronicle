import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { PageProvider } from '@/lib/page-context'
import { App } from './App'
import type { ReactNode } from 'react'
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types'
import type { ApiSpec } from '@/lib/openapi'

export interface SSRData {
  config: ChronicleConfig
  tree: PageTree
  page: {
    slug: string[]
    frontmatter: Frontmatter
    content: ReactNode
  } | null
  apiSpecs: ApiSpec[]
}

export function render(url: string, data: SSRData): string {
  const pathname = new URL(url, 'http://localhost').pathname

  return renderToString(
    <StaticRouter location={pathname}>
      <PageProvider
        initialConfig={data.config}
        initialTree={data.tree}
        initialPage={data.page}
        initialApiSpecs={data.apiSpecs}
      >
        <App />
      </PageProvider>
    </StaticRouter>,
  )
}
