// Production server entry — built by Vite, loaded by prod.ts at runtime
import { createServer } from 'http'
import { readFileSync, createReadStream } from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { render } from './entry-server'
import { matchRoute } from './router'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { getPage, loadPageComponent, buildPageTree } from '@/lib/source'
import { handleRequest } from './request-handler'

export { render, matchRoute, loadConfig, loadApiSpecs, getPage, loadPageComponent, buildPageTree }

async function writeResponse(res: import('http').ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
  const body = await response.text()
  res.end(body)
}

export async function startServer(options: { port: number; distDir: string }) {
  const { port, distDir } = options

  const clientDir = path.resolve(distDir, 'client')
  const templatePath = path.resolve(clientDir, 'src/server/index.html')
  const template = readFileSync(templatePath, 'utf-8')

  const sirv = (await import('sirv')).default
  const assets = sirv(clientDir, { gzip: true })

  const baseUrl = `http://localhost:${port}`

  const server = createServer(async (req, res) => {
    const url = req.url || '/'

    try {
      // API routes — handled by shared request handler
      const routeHandler = matchRoute(new URL(url, baseUrl).href)
      if (routeHandler) {
        const response = await routeHandler(new Request(new URL(url, baseUrl)))
        await writeResponse(res, response)
        return
      }

      // Serve static files from content dir (skip .md/.mdx)
      const contentDir = process.env.CHRONICLE_CONTENT_DIR || process.cwd()
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
        } catch { /* fall through */ }
      }

      // Static assets from dist/client
      const assetHandled = await new Promise<boolean>((resolve) => {
        assets(req, res, () => resolve(false))
        res.on('close', () => resolve(true))
      })
      if (assetHandled) return

      // SSR render — handled by shared request handler
      const response = await handleRequest(url, { template, baseUrl })
      await writeResponse(res, response)
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
