import { createServer as createViteServer } from 'vite'
import { createServer } from 'http'
import fsPromises from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import chalk from 'chalk'
import { createViteConfig } from './vite-config'

export interface DevServerOptions {
  port: number
  root: string
  contentDir: string
}

export async function startDevServer(options: DevServerOptions) {
  const { port, root, contentDir } = options

  const viteConfig = await createViteConfig({ root, contentDir, isDev: true })
  const vite = await createViteServer({
    ...viteConfig,
    server: { middlewareMode: true },
    appType: 'custom',
  })

  const templatePath = path.resolve(root, 'src/server/index.html')

  const server = createServer(async (req, res) => {
    const url = req.url || '/'

    try {
      // Let Vite handle its own requests (HMR, modules)
      if (url.startsWith('/@') || url.startsWith('/__vite') || url.startsWith('/node_modules/')) {
        vite.middlewares(req, res, () => {
          res.statusCode = 404
          res.end()
        })
        return
      }

      // Serve static files from content dir (skip .md/.mdx)
      const contentFile = path.join(contentDir, decodeURIComponent(url.split('?')[0]))
      if (!url.endsWith('.md') && !url.endsWith('.mdx')) {
        try {
          const stat = await fsPromises.stat(contentFile)
          if (stat.isFile()) {
            const ext = path.extname(contentFile).toLowerCase()
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
              '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.json': 'application/json',
              '.yaml': 'text/yaml', '.yml': 'text/yaml', '.txt': 'text/plain',
            }
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            createReadStream(contentFile).pipe(res)
            return
          }
        } catch { /* fall through to SSR */ }
      }

      // Let Vite handle JS/CSS/TS module requests and other static assets
      if (/\.(js|ts|tsx|css|map)(\?|$)/.test(url)) {
        vite.middlewares(req, res, () => {
          res.statusCode = 404
          res.end()
        })
        return
      }

      // Check API/static routes (load through Vite SSR for import.meta.glob support)
      const { matchRoute } = await vite.ssrLoadModule(path.resolve(root, 'src/server/router.ts'))
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

      // Resolve page data before SSR render
      const pathname = new URL(url, `http://localhost:${port}`).pathname
      const slug = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean)

      const source = await vite.ssrLoadModule(path.resolve(root, 'src/lib/source.ts'))
      const { mdxComponents } = await vite.ssrLoadModule(path.resolve(root, 'src/components/mdx/index.tsx'))
      const { loadConfig } = await vite.ssrLoadModule(path.resolve(root, 'src/lib/config.ts'))

      const config = loadConfig()

      const { loadApiSpecs } = await vite.ssrLoadModule(path.resolve(root, 'src/lib/openapi.ts'))
      const apiSpecs = config.api?.length ? loadApiSpecs(config.api) : []

      const [tree, sourcePage] = await Promise.all([
        source.buildPageTree(),
        source.getPage(slug),
      ])

      let pageData = null
      // Don't embed apiSpecs — too large. Client fetches via /api/specs
      let embeddedData: any = { config, tree, slug, frontmatter: null, filePath: null }

      if (sourcePage) {
        const component = await source.loadPageComponent(sourcePage)
        const React = await import('react')
        const MDXBody = component
        pageData = {
          slug,
          frontmatter: sourcePage.frontmatter,
          content: MDXBody ? React.createElement(MDXBody, { components: mdxComponents }) : null,
        }
        embeddedData.frontmatter = sourcePage.frontmatter
        embeddedData.filePath = sourcePage.filePath
      }

      // SSR render
      let template = await fsPromises.readFile(templatePath, 'utf-8')
      template = await vite.transformIndexHtml(url, template)

      // Embed page data for client hydration
      const dataScript = `<script>window.__PAGE_DATA__ = ${JSON.stringify(embeddedData)}</script>`
      template = template.replace('<!--head-outlet-->', `<!--head-outlet-->${dataScript}`)

      const { render } = await vite.ssrLoadModule(path.resolve(root, 'src/server/entry-server.tsx'))

      const html = render(url, { config, tree, page: pageData, apiSpecs })
      const finalHtml = template.replace('<!--ssr-outlet-->', html)

      res.setHeader('Content-Type', 'text/html')
      res.statusCode = 200
      res.end(finalHtml)
    } catch (e) {
      vite.ssrFixStacktrace(e as Error)
      console.error(e)
      res.statusCode = 500
      res.end((e as Error).message)
    }
  })

  server.listen(port, () => {
    console.log(chalk.cyan(`\n  Chronicle dev server running at:`))
    console.log(chalk.green(`  http://localhost:${port}\n`))
  })

  // Graceful shutdown
  const shutdown = () => {
    vite.close()
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return { server, vite }
}
