// Production server entry — built by Vite, loaded by prod.ts at runtime
import { createServer } from 'http'
import { readFileSync } from 'fs'
import path from 'path'
import React from 'react'
import { render } from './entry-server'
import { matchRoute } from './router'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { getPage, loadPageComponent, buildPageTree } from '@/lib/source'
import { mdxComponents } from '@/components/mdx'

export { render, matchRoute, loadConfig, loadApiSpecs, getPage, loadPageComponent, buildPageTree }

export async function startServer(options: { port: number; distDir: string }) {
  const { port, distDir } = options

  const clientDir = path.resolve(distDir, 'client')
  const templatePath = path.resolve(clientDir, 'src/server/index.html')
  const template = readFileSync(templatePath, 'utf-8')

  const sirv = (await import('sirv')).default
  const assets = sirv(clientDir, { gzip: true })

  const server = createServer(async (req, res) => {
    const url = req.url || '/'

    try {
      // API routes
      const routeHandler = matchRoute(new URL(url, `http://localhost:${port}`).href)
      if (routeHandler) {
        const request = new Request(new URL(url, `http://localhost:${port}`))
        const response = await routeHandler(request)
        res.statusCode = response.status
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
        const body = await response.text()
        res.end(body)
        return
      }

      // Static assets
      const assetHandled = await new Promise<boolean>((resolve) => {
        assets(req, res, () => resolve(false))
        res.on('close', () => resolve(true))
      })
      if (assetHandled) return

      // Resolve page data
      const pathname = new URL(url, `http://localhost:${port}`).pathname
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

      // SSR render
      const html = render(url, { config, tree, page: pageData, apiSpecs })

      const dataScript = `<script>window.__PAGE_DATA__ = ${JSON.stringify(embeddedData)}</script>`
      const finalHtml = template
        .replace('<!--head-outlet-->', `<!--head-outlet-->${dataScript}`)
        .replace('<!--ssr-outlet-->', html)

      res.setHeader('Content-Type', 'text/html')
      res.statusCode = 200
      res.end(finalHtml)
    } catch (e) {
      console.error(e)
      res.statusCode = 500
      res.end((e as Error).message)
    }
  })

  server.listen(port, () => {
    console.log(`\n  Chronicle production server running at:`)
    console.log(`  http://localhost:${port}\n`)
  })

  const shutdown = () => {
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}
