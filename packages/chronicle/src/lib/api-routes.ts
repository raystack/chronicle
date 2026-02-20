import type { OpenAPIV3 } from 'openapi-types'
import slugify from 'slugify'
import type { PageTree, PageTreeItem } from '@/types/content'
import type { ApiSpec } from './openapi'

export function getSpecSlug(spec: ApiSpec): string {
  return slugify(spec.name, { lower: true, strict: true })
}


export function buildApiRoutes(specs: ApiSpec[]): { slug: string[] }[] {
  const routes: { slug: string[] }[] = []

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec)
    const paths = spec.document.paths ?? {}

    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method]
        if (!op?.operationId) continue
        routes.push({ slug: [specSlug, encodeURIComponent(op.operationId)] })
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
      if (op?.operationId && encodeURIComponent(op.operationId) === operationId) {
        return { spec, operation: op, method: method.toUpperCase(), path: pathStr }
      }
    }
  }

  return null
}

export function buildApiPageTree(specs: ApiSpec[]): PageTree {
  const children: PageTreeItem[] = []

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec)
    const paths = spec.document.paths ?? {}
    const tags = spec.document.tags ?? []

    // Group operations by tag (case-insensitive to avoid duplicates)
    const opsByTag = new Map<string, PageTreeItem[]>()
    const tagDisplayName = new Map<string, string>()

    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method]
        if (!op?.operationId) continue

        const rawTag = op.tags?.[0] ?? 'default'
        const tagKey = rawTag.toLowerCase()
        if (!opsByTag.has(tagKey)) {
          opsByTag.set(tagKey, [])
          tagDisplayName.set(tagKey, rawTag.charAt(0).toUpperCase() + rawTag.slice(1))
        }

        opsByTag.get(tagKey)!.push({
          type: 'page',
          name: op.summary ?? op.operationId,
          url: `/apis/${specSlug}/${encodeURIComponent(op.operationId)}`,
          icon: `method-${method}`,
        })
      }
    }

    // Use doc.tags display names where available
    for (const t of tags) {
      const key = t.name.toLowerCase()
      if (opsByTag.has(key)) {
        tagDisplayName.set(key, t.name.charAt(0).toUpperCase() + t.name.slice(1))
      }
    }

    const tagFolders: PageTreeItem[] = Array.from(opsByTag.entries()).map(([key, ops]) => ({
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
      })
    } else {
      children.push(...tagFolders)
    }
  }

  return { name: 'API Reference', children }
}
