export interface RouteHandler {
  (req: Request): Response | Promise<Response>
}

interface Route {
  pattern: URLPattern
  handler: RouteHandler
}

const routes: Route[] = []

function addRoute(path: string, handler: RouteHandler) {
  routes.push({
    pattern: new URLPattern({ pathname: path }),
    handler,
  })
}

// API routes (stub handlers — replaced in Phase 4)
addRoute('/api/search', () => new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json' } }))
addRoute('/api/health', () => new Response('ok'))
addRoute('/api/apis-proxy', () => new Response('not implemented', { status: 501 }))

// Static content routes (stub handlers — replaced in Phase 4)
addRoute('/og', () => new Response('not implemented', { status: 501 }))
addRoute('/llms.txt', () => new Response('', { headers: { 'content-type': 'text/plain' } }))
addRoute('/llms-full.txt', () => new Response('', { headers: { 'content-type': 'text/plain' } }))
addRoute('/sitemap.xml', () => new Response('<urlset/>', { headers: { 'content-type': 'application/xml' } }))
addRoute('/robots.txt', () => new Response('User-agent: *\nAllow: /', { headers: { 'content-type': 'text/plain' } }))

export function matchRoute(url: string): RouteHandler | null {
  for (const route of routes) {
    if (route.pattern.test(url)) {
      return route.handler
    }
  }
  return null
}
