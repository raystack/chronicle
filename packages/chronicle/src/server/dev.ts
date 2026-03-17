import { createServer as createViteServer } from 'vite'
import { createServer } from 'http'
import path from 'path'
import chalk from 'chalk'
import { createViteConfig } from './vite-config'

export interface DevServerOptions {
  port: number
  root: string
  contentDir: string
}

function isStaticAsset(url: string): boolean {
  return url.startsWith('/@') ||
    url.startsWith('/node_modules/') ||
    url.startsWith('/__vite') ||
    /\.(js|ts|tsx|css|ico|png|jpg|svg|woff2?|ttf|eot|map)(\?|$)/.test(url)
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
      // Let Vite handle static assets, HMR, and module requests
      if (isStaticAsset(url)) {
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

      const [tree, sourcePage] = await Promise.all([
        source.buildPageTree(),
        source.getPage(slug),
      ])

      let pageData = null
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
      const { readFileSync } = await import('fs')
      let template = readFileSync(templatePath, 'utf-8')
      template = await vite.transformIndexHtml(url, template)

      // Embed page data for client hydration
      const dataScript = `<script>window.__PAGE_DATA__ = ${JSON.stringify(embeddedData)}</script>`
      template = template.replace('<!--head-outlet-->', `<!--head-outlet-->${dataScript}`)

      const { render } = await vite.ssrLoadModule(path.resolve(root, 'src/server/entry-server.tsx'))

      const html = render(url, { config, tree, page: pageData })
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
