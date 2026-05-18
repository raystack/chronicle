import type { OpenAPIV3 } from 'openapi-types'
import { HTTPError } from 'nitro'
import { loadConfig } from '@/lib/config'
import { loadApiSpecs } from '@/lib/openapi'
import { findApiOperation } from '@/lib/api-routes'
import { substituteEnvVars } from '@/lib/env'
import { flattenSchema, generateExampleJson, type SchemaField } from '@/lib/schema'
import { generateCurl } from '@/lib/snippet-generators'

export async function handleApiMarkdown(pathname: string) {
  const stripped = pathname.replace(/\.md$/, '').replace(/^\/apis\//, '')
  const slug = stripped.split('/').filter(Boolean)
  if (slug.length < 2) {
    throw new HTTPError({ status: 404, message: 'Not Found' })
  }

  const config = loadConfig()
  const specs = await loadApiSpecs(config.api ?? [])
  const match = findApiOperation(specs, slug)

  if (!match) {
    throw new HTTPError({ status: 404, message: 'Not Found' })
  }

  const md = generateApiMarkdown(match.method, match.path, match.operation, substituteEnvVars(match.spec.server.url), match.spec.auth)
  return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}

function generateApiMarkdown(
  method: string,
  path: string,
  operation: OpenAPIV3.OperationObject,
  serverUrl: string,
  auth?: { type: string; header: string; placeholder?: string },
): string {
  const lines: string[] = []
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]

  lines.push(`# ${operation.summary ?? `${method} ${path}`}`)
  lines.push('')
  if (operation.description) {
    lines.push(operation.description)
    lines.push('')
  }
  lines.push(`\`${method}\` \`${path}\``)
  lines.push('')

  const headerParams = params.filter(p => p.in === 'header')
  const pathParams = params.filter(p => p.in === 'path')
  const queryParams = params.filter(p => p.in === 'query')

  if (auth || headerParams.length > 0) {
    lines.push('## Authorization')
    lines.push('')
    lines.push('| Header | Type | Required | Description |')
    lines.push('| --- | --- | --- | --- |')
    if (auth) {
      lines.push(`| \`${auth.header}\` | string | Yes | ${auth.placeholder ?? 'API key'} |`)
    }
    for (const p of headerParams) {
      const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`)
    }
    lines.push('')
  }

  if (pathParams.length > 0) {
    lines.push('## Path Parameters')
    lines.push('')
    lines.push('| Parameter | Type | Required | Description |')
    lines.push('| --- | --- | --- | --- |')
    for (const p of pathParams) {
      const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`)
    }
    lines.push('')
  }

  if (queryParams.length > 0) {
    lines.push('## Query Parameters')
    lines.push('')
    lines.push('| Parameter | Type | Required | Description |')
    lines.push('| --- | --- | --- | --- |')
    for (const p of queryParams) {
      const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`)
    }
    lines.push('')
  }

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined
  if (requestBody?.content) {
    const contentType = Object.keys(requestBody.content)[0]
    const schema = contentType ? requestBody.content[contentType]?.schema as OpenAPIV3.SchemaObject : undefined
    if (schema) {
      lines.push('## Request Body')
      lines.push('')
      lines.push(`Content-Type: \`${contentType}\``)
      lines.push('')
      const fields = flattenSchema(schema)
      if (fields.length > 0) {
        lines.push('| Field | Type | Required | Description |')
        lines.push('| --- | --- | --- | --- |')
        renderFieldTable(fields, lines, 0)
        lines.push('')
      }
      const example = generateExampleJson(schema)
      lines.push('**Example:**')
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(example, null, 2))
      lines.push('```')
      lines.push('')
    }
  }

  const responses = operation.responses as Record<string, OpenAPIV3.ResponseObject> | undefined
  if (responses) {
    lines.push('## Responses')
    lines.push('')
    for (const [status, resp] of Object.entries(responses)) {
      lines.push(`### ${status}${resp.description ? ` — ${resp.description}` : ''}`)
      lines.push('')
      const content = resp.content ?? {}
      const contentType = Object.keys(content)[0]
      const schema = contentType ? content[contentType]?.schema as OpenAPIV3.SchemaObject : undefined
      if (schema) {
        const fields = flattenSchema(schema)
        if (fields.length > 0) {
          lines.push('| Field | Type | Description |')
          lines.push('| --- | --- | --- |')
          renderResponseFieldTable(fields, lines, 0)
          lines.push('')
        }
        const example = generateExampleJson(schema)
        lines.push('```json')
        lines.push(JSON.stringify(example, null, 2))
        lines.push('```')
        lines.push('')
      }
    }
  }

  const headers: Record<string, string> = {}
  if (auth) headers[auth.header] = auth.placeholder ?? 'YOUR_API_KEY'
  if (requestBody?.content) {
    const ct = Object.keys(requestBody.content)[0]
    if (ct) headers['Content-Type'] = ct
  }

  const bodySchema = requestBody?.content
    ? (Object.values(requestBody.content)[0]?.schema as OpenAPIV3.SchemaObject | undefined)
    : undefined
  const bodyStr = bodySchema ? JSON.stringify(generateExampleJson(bodySchema), null, 2) : undefined

  lines.push('## cURL')
  lines.push('')
  lines.push('```bash')
  lines.push(generateCurl({ method, url: serverUrl + path, headers, body: bodyStr }))
  lines.push('```')

  return lines.join('\n')
}

function renderFieldTable(fields: SchemaField[], lines: string[], depth: number) {
  const indent = '  '.repeat(depth)
  for (const f of fields) {
    lines.push(`| ${indent}\`${f.name}\` | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${f.description ?? ''} |`)
    if (f.children) renderFieldTable(f.children, lines, depth + 1)
  }
}

function renderResponseFieldTable(fields: SchemaField[], lines: string[], depth: number) {
  const indent = '  '.repeat(depth)
  for (const f of fields) {
    lines.push(`| ${indent}\`${f.name}\` | ${f.type} | ${f.description ?? ''} |`)
    if (f.children) renderResponseFieldTable(f.children, lines, depth + 1)
  }
}
