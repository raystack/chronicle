// Shared request handler for API routes + SSR rendering
// Used by entry-prod.ts (Node) and entry-vercel.ts (Vercel)
import React from 'react'
import { render } from './entry-server'
import { matchRoute } from './router'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { getPage, loadPageComponent, buildPageTree } from '@/lib/source'
import { mdxComponents } from '@/components/mdx'

export interface RequestHandlerOptions {
  template: string
  baseUrl: string
}

export async function handleRequest(url: string, options: RequestHandlerOptions): Promise<Response> {
  const { template, baseUrl } = options
  const fullUrl = new URL(url, baseUrl).href

  // API routes
  const routeHandler = matchRoute(fullUrl)
  if (routeHandler) {
    return routeHandler(new Request(fullUrl))
  }

  // SSR render
  const pathname = new URL(url, baseUrl).pathname
  const slug = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean)

  const config = loadConfig()
  const apiSpecs = config.api?.length ? loadApiSpecs(config.api) : []

  const [tree, sourcePage] = await Promise.all([
    buildPageTree(),
    getPage(slug),
  ])

  let pageData = null
  let embeddedData: any = { config, tree, slug, frontmatter: null, filePath: null }

  if (sourcePage) {
    const component = await loadPageComponent(sourcePage)
    pageData = {
      slug,
      frontmatter: sourcePage.frontmatter,
      content: component ? React.createElement(component, { components: mdxComponents }) : null,
    }
    embeddedData.frontmatter = sourcePage.frontmatter
    embeddedData.filePath = sourcePage.filePath
  }

  const html = render(url, { config, tree, page: pageData, apiSpecs })

  const safeJson = JSON.stringify(embeddedData).replace(/</g, '\\u003c')
  const dataScript = `<script>window.__PAGE_DATA__ = ${safeJson}</script>`
  const finalHtml = template
    .replace('<!--head-outlet-->', `<!--head-outlet-->${dataScript}`)
    .replace('<!--ssr-outlet-->', html)

  return new Response(finalHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
