import fs from 'fs'
import path from 'path'
import type { OpenAPIV2, OpenAPIV3 } from 'openapi-types'
import type { ApiConfig, ApiServerConfig, ApiAuthConfig } from '../types/config'

type JsonObject = Record<string, unknown>

export interface ApiSpec {
  name: string
  basePath: string
  server: ApiServerConfig
  auth?: ApiAuthConfig
  document: OpenAPIV3.Document
}

export interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
  default?: unknown
  children?: SchemaField[]
}

export function loadApiSpecs(apiConfigs: ApiConfig[]): ApiSpec[] {
  const contentDir = process.env.CHRONICLE_CONTENT_DIR ?? process.cwd()
  return apiConfigs.map((config) => loadApiSpec(config, contentDir))
}

export function loadApiSpec(config: ApiConfig, contentDir: string): ApiSpec {
  const specPath = path.resolve(contentDir, config.spec)
  const raw = fs.readFileSync(specPath, 'utf-8')
  const doc = JSON.parse(raw) as OpenAPIV2.Document | OpenAPIV3.Document

  let v3Doc: OpenAPIV3.Document

  if ('swagger' in doc && doc.swagger === '2.0') {
    v3Doc = convertV2toV3(doc as OpenAPIV2.Document)
  } else if ('openapi' in doc && doc.openapi.startsWith('3.')) {
    v3Doc = resolveDocument(doc as OpenAPIV3.Document)
  } else {
    throw new Error(`Unsupported spec version in ${config.spec}`)
  }

  return {
    name: config.name,
    basePath: config.basePath,
    server: config.server,
    auth: config.auth,
    document: v3Doc,
  }
}

// --- $ref resolution ---

function resolveRef(ref: string, root: JsonObject): JsonObject {
  const parts = ref.replace(/^#\//, '').split('/')
  let current: unknown = root
  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as JsonObject)[part]
    } else {
      throw new Error(`Cannot resolve $ref: ${ref}`)
    }
  }
  return current as JsonObject
}

function deepResolveRefs(obj: unknown, root: JsonObject, seen = new Set<string>()): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => deepResolveRefs(item, root, seen))
  }

  const record = obj as JsonObject

  if (typeof record.$ref === 'string') {
    if (seen.has(record.$ref)) return { type: 'object', description: '[circular]' }
    seen.add(record.$ref)
    const resolved = resolveRef(record.$ref, root)
    return deepResolveRefs(resolved, root, seen)
  }

  const result: JsonObject = {}
  for (const [key, value] of Object.entries(record)) {
    result[key] = deepResolveRefs(value, root, seen)
  }
  return result
}

function resolveDocument(doc: OpenAPIV3.Document): OpenAPIV3.Document {
  const root = doc as unknown as JsonObject
  return deepResolveRefs(doc, root) as unknown as OpenAPIV3.Document
}

// --- V2 → V3 conversion ---

function convertV2toV3(doc: OpenAPIV2.Document): OpenAPIV3.Document {
  const root = doc as unknown as JsonObject
  const resolved = deepResolveRefs(doc, root) as unknown as OpenAPIV2.Document

  const v3Paths: OpenAPIV3.PathsObject = {}

  for (const [pathStr, pathItem] of Object.entries(resolved.paths ?? {})) {
    if (!pathItem) continue
    const v3PathItem: OpenAPIV3.PathItemObject = {}

    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV2.OperationObject | undefined
      if (!op) continue
      v3PathItem[method] = convertV2Operation(op)
    }

    v3Paths[pathStr] = v3PathItem
  }

  return {
    openapi: '3.0.0',
    info: resolved.info as unknown as OpenAPIV3.InfoObject,
    paths: v3Paths,
    tags: (resolved.tags ?? []) as unknown as OpenAPIV3.TagObject[],
  }
}

function convertV2Operation(op: OpenAPIV2.OperationObject): OpenAPIV3.OperationObject {
  const params = (op.parameters ?? []) as OpenAPIV2.Parameter[]

  const v3Params: OpenAPIV3.ParameterObject[] = params
    .filter((p) => p.in !== 'body')
    .map((p) => ({
      name: p.name,
      in: p.in as 'path' | 'query' | 'header' | 'cookie',
      required: p.required ?? false,
      description: p.description,
      schema: { type: (p as JsonObject).type as string, format: (p as JsonObject).format as string | undefined } as OpenAPIV3.SchemaObject,
    }))

  const bodyParam = params.find((p) => p.in === 'body') as JsonObject | undefined
  let requestBody: OpenAPIV3.RequestBodyObject | undefined
  if (bodyParam?.schema) {
    requestBody = {
      required: (bodyParam.required as boolean) ?? false,
      content: {
        'application/json': {
          schema: bodyParam.schema as OpenAPIV3.SchemaObject,
        },
      },
    }
  }

  const v3Responses: OpenAPIV3.ResponsesObject = {}
  for (const [status, resp] of Object.entries(op.responses ?? {})) {
    const v2Resp = resp as OpenAPIV2.ResponseObject
    const v3Resp: OpenAPIV3.ResponseObject = {
      description: v2Resp.description ?? '',
    }
    if ((v2Resp as unknown as JsonObject).schema) {
      v3Resp.content = {
        'application/json': {
          schema: (v2Resp as unknown as JsonObject).schema as OpenAPIV3.SchemaObject,
        },
      }
    }
    v3Responses[status] = v3Resp
  }

  const result: OpenAPIV3.OperationObject = {
    operationId: op.operationId,
    summary: op.summary,
    description: op.description,
    tags: op.tags,
    parameters: v3Params,
    responses: v3Responses,
  }

  if (requestBody) {
    result.requestBody = requestBody
  }

  return result
}

// --- Schema flattening (for table rendering) ---

export function flattenSchema(
  schema: OpenAPIV3.SchemaObject,
  requiredFields: string[] = [],
): SchemaField[] {
  if (schema.type === 'array' && schema.items) {
    const items = schema.items as OpenAPIV3.SchemaObject
    return flattenSchema(items).map((f) => ({
      ...f,
      type: `${f.type}[]`,
    }))
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, OpenAPIV3.SchemaObject>
    const required = schema.required ?? requiredFields

    return Object.entries(properties).map(([name, prop]) => {
      const fieldType = inferType(prop)
      const children =
        fieldType === 'object' || prop.properties
          ? flattenSchema(prop, prop.required)
          : fieldType.endsWith('[]') && (prop as OpenAPIV3.ArraySchemaObject).items
            ? flattenSchema((prop as OpenAPIV3.ArraySchemaObject).items as OpenAPIV3.SchemaObject)
            : undefined

      return {
        name,
        type: fieldType,
        required: required.includes(name),
        description: prop.description,
        default: prop.default,
        children: children?.length ? children : undefined,
      }
    })
  }

  return []
}

function inferType(schema: OpenAPIV3.SchemaObject): string {
  if (schema.type === 'array') {
    const items = schema.items as OpenAPIV3.SchemaObject | undefined
    const itemType = items ? inferType(items) : 'unknown'
    return `${itemType}[]`
  }

  if (schema.format) return `${schema.type}(${schema.format})`
  return (schema.type as string) ?? 'object'
}
