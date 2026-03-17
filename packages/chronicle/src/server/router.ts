import { handleHealth } from './handlers/health'
import { handleSearch } from './handlers/search'
import { handleApisProxy } from './handlers/apis-proxy'
import { handleOg } from './handlers/og'
import { handleLlms } from './handlers/llms'
import { handleSitemap } from './handlers/sitemap'
import { handleRobots } from './handlers/robots'

export type RouteHandler = (req: Request) => Response | Promise<Response>

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

addRoute('/api/health', handleHealth)
addRoute('/api/search', handleSearch)
addRoute('/api/apis-proxy', handleApisProxy)
addRoute('/og', handleOg)
addRoute('/llms.txt', handleLlms)
addRoute('/sitemap.xml', handleSitemap)
addRoute('/robots.txt', handleRobots)

export function matchRoute(url: string): RouteHandler | null {
  for (const route of routes) {
    if (route.pattern.test(url)) {
      return route.handler
    }
  }
  return null
}
