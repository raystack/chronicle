import { source } from '@/lib/source'
import { createSearchAPI, type AdvancedIndex } from 'fumadocs-core/search/server'
import type { StructuredData } from 'fumadocs-core/mdx-plugins'
import type { OpenAPIV3 } from 'openapi-types'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs, type ApiSpec } from '@/lib/openapi'
import { getSpecSlug } from '@/lib/api-routes'

interface PageData {
  title?: string
  description?: string
  structuredData?: StructuredData
  load?: () => Promise<{ structuredData?: StructuredData }>
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

function getParamNames(op: OpenAPIV3.OperationObject): string[] {
  const params = (op.parameters as OpenAPIV3.ParameterObject[] | undefined) ?? []
  return params.map((p) => p.name)
}

function buildStructuredData(op: OpenAPIV3.OperationObject, method: string, pathStr: string) {
  return {
    headings: [{ id: op.operationId!, content: `${method.toUpperCase()} ${pathStr}` }],
    contents: [{ heading: op.operationId!, content: `${method.toUpperCase()} ${[op.description, ...getParamNames(op)].filter(Boolean).join(' ')}` }],
  }
}

function operationToIndex(specSlug: string, pathStr: string, method: HttpMethod, op: OpenAPIV3.OperationObject): AdvancedIndex {
  const url = `/apis/${specSlug}/${encodeURIComponent(op.operationId!)}`
  return {
    id: url,
    url,
    title: `${method.toUpperCase()} ${op.summary ?? op.operationId!}`,
    description: op.description ?? '',
    structuredData: buildStructuredData(op, method, pathStr),
  }
}

function pathEntryToIndexes(specSlug: string) {
  return ([pathStr, pathItem]: [string, OpenAPIV3.PathItemObject | undefined]): AdvancedIndex[] => {
    if (!pathItem) return []
    const hasOp = (m: HttpMethod) => !!pathItem[m]?.operationId
    const toIndex = (m: HttpMethod) => operationToIndex(specSlug, pathStr, m, pathItem[m]!)
    return HTTP_METHODS.filter(hasOp).map(toIndex)
  }
}

function specToIndexes(spec: ApiSpec): AdvancedIndex[] {
  const specSlug = getSpecSlug(spec)
  return Object.entries(spec.document.paths ?? {}).flatMap(pathEntryToIndexes(specSlug))
}

function buildApiIndexes(): AdvancedIndex[] {
  const config = loadConfig()
  if (!config.api?.length) return []
  return loadApiSpecs(config.api).flatMap(specToIndexes)
}

export const { GET } = createSearchAPI('advanced', {
  indexes: async (): Promise<AdvancedIndex[]> => {
    const pages = source.getPages()
    const indexes = await Promise.all(
      pages.map(async (page): Promise<AdvancedIndex> => {
        const data = page.data as PageData
        let structuredData: StructuredData | undefined = data.structuredData

        if (!structuredData && data.load) {
          try {
            const loaded = await data.load()
            structuredData = loaded.structuredData
          } catch (error) {
            console.error(`Failed to load structured data for ${page.url}:`, error)
          }
        }

        return {
          id: page.url,
          url: page.url,
          title: data.title ?? '',
          description: data.description ?? '',
          structuredData: structuredData ?? { headings: [], contents: [] },
        }
      })
    )
    return [...indexes, ...buildApiIndexes()]
  },
})
