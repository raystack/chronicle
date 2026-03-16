import { createServer } from 'http'
import { readFileSync } from 'fs'
import { PassThrough } from 'stream'
import path from 'path'
import chalk from 'chalk'
import { matchRoute } from './router'

export interface ProdServerOptions {
  port: number
  root: string
  distDir: string
}

export async function startProdServer(options: ProdServerOptions) {
  const { port, root, distDir } = options

  const clientDir = path.resolve(distDir, 'client')
  const serverEntry = path.resolve(distDir, 'server/entry-server.js')

  const template = readFileSync(path.resolve(clientDir, 'index.html'), 'utf-8')
  const { render } = await import(serverEntry)

  // Dynamic import sirv for static file serving
  const sirv = (await import('sirv')).default
  const assets = sirv(clientDir, { gzip: true })

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

      // Try static assets first
      const assetHandled = await new Promise<boolean>((resolve) => {
        assets(req, res, () => resolve(false))
        res.on('close', () => resolve(true))
      })
      if (assetHandled) return

      // SSR render
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
          res.end('<pre>Server Error</pre>')
          console.error(error)
        },
      })
    } catch (e) {
      console.error(e)
      res.statusCode = 500
      res.end((e as Error).message)
    }
  })

  server.listen(port, () => {
    console.log(chalk.cyan(`\n  Chronicle production server running at:`))
    console.log(chalk.green(`  http://localhost:${port}\n`))
  })

  const shutdown = () => {
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}
