import type { OpenAPIV3 } from 'openapi-types'
import slugify from 'slugify'
import type { Root, Node, Item, Folder } from 'fumadocs-core/page-tree'
import type { ApiSpec } from './openapi'

export function getSpecSlug(spec: ApiSpec): string {
  return slugify(spec.name, { lower: true, strict: true })
}

function deriveOperationId(method: string, path: string): string {
  const slug = path.replace(/[/{}\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return `${method}_${slug || 'root'}`
}

function getOperationId(op: OpenAPIV3.OperationObject, method: string, path: string): string {
  return op.operationId || deriveOperationId(method, path)
}


export function buildApiRoutes(specs: ApiSpec[]): { slug: string[] }[] {
  const routes: { slug: string[] }[] = []

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec)
    const paths = spec.document.paths ?? {}

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method]
        if (!op) continue
        const opId = getOperationId(op, method, pathStr)
        routes.push({ slug: [specSlug, encodeURIComponent(opId)] })
      }
    }
  }

  return routes
}

export interface ApiRouteMatch {
  spec: ApiSpec
  operation: OpenAPIV3.OperationObject
  method: string
  path: string
}

export function findApiOperation(specs: ApiSpec[], slug: string[]): ApiRouteMatch | null {
  if (slug.length !== 2) return null
  const [specSlug, operationId] = slug

  const spec = specs.find((s) => getSpecSlug(s) === specSlug)
  if (!spec) return null

  const paths = spec.document.paths ?? {}
  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue
    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const op = pathItem[method]
      if (!op) continue
      const opId = getOperationId(op, method, pathStr)
      if (encodeURIComponent(opId) === operationId) {
        return { spec, operation: op, method: method.toUpperCase(), path: pathStr }
      }
    }
  }

  return null
}

export function buildApiPageTree(specs: ApiSpec[]): Root {
  const children: Node[] = []

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec)
    const paths = spec.document.paths ?? {}
    const tags = spec.document.tags ?? []

    const opsByTag = new Map<string, Item[]>()
    const tagDisplayName = new Map<string, string>()

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method]
        if (!op) continue

        const opId = getOperationId(op, method, pathStr)
        const rawTag = op.tags?.[0] ?? 'default'
        const tagKey = rawTag.toLowerCase()
        if (!opsByTag.has(tagKey)) {
          opsByTag.set(tagKey, [])
          tagDisplayName.set(tagKey, rawTag.charAt(0).toUpperCase() + rawTag.slice(1))
        }

        opsByTag.get(tagKey)!.push({
          type: 'page',
          name: op.summary ?? opId,
          url: `/apis/${specSlug}/${encodeURIComponent(opId)}`,
          icon: `method-${method}`,
        })
      }
    }

    for (const t of tags) {
      const key = t.name.toLowerCase()
      if (opsByTag.has(key)) {
        tagDisplayName.set(key, t.name.charAt(0).toUpperCase() + t.name.slice(1))
      }
    }

    const tagFolders: Folder[] = Array.from(opsByTag.entries()).map(([key, ops]) => ({
      type: 'folder' as const,
      name: tagDisplayName.get(key) ?? key,
      icon: 'rectangle-stack',
      children: ops,
    }))

    if (specs.length > 1) {
      children.push({
        type: 'folder',
        name: spec.name,
        children: tagFolders,
      } as Folder)
    } else {
      children.push(...tagFolders)
    }
  }

  return { name: 'API Reference', children }
}
