import { createServer as createViteServer } from 'vite'
import { createServer } from 'http'
import { PassThrough } from 'stream'
import path from 'path'
import chalk from 'chalk'
import { createViteConfig } from './vite-config'
import { matchRoute } from './router'

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
      // Check API/static routes first
      const routeHandler = matchRoute(new URL(url, `http://localhost:${port}`).href)
      if (routeHandler) {
        const request = new Request(new URL(url, `http://localhost:${port}`))
        const response = await routeHandler(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        const body = await response.text()
        res.end(body)
        return
      }

      // Let Vite handle static assets and HMR
      const isHandled = await new Promise<boolean>((resolve) => {
        vite.middlewares(req, res, () => resolve(false))
        res.on('close', () => resolve(true))
      })
      if (isHandled) return

      // SSR render
      const { readFileSync } = await import('fs')
      let template = readFileSync(templatePath, 'utf-8')
      template = await vite.transformIndexHtml(url, template)

      const { render } = await vite.ssrLoadModule(path.resolve(root, 'src/server/entry-server.tsx'))

      const { pipe } = render(url, {
        onShellReady() {
          res.setHeader('Content-Type', 'text/html')
          res.statusCode = 200

          const [before, after] = template.split('<!--ssr-outlet-->')
          res.write(before)

          const passthrough = new PassThrough()
          passthrough.on('end', () => {
            res.end(after)
          })

          pipe(passthrough)
        },
        onShellError(error: unknown) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/html')
          res.end('<pre>SSR Error</pre>')
          console.error(error)
        },
      })
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
