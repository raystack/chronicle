'use client'

import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Text, Headline, Button } from '@raystack/apsara'
import { MethodBadge } from './method-badge'
import { FieldSection } from './field-section'
import { CodeSnippets } from './code-snippets'
import { flattenSchema, generateExampleJson, type SchemaField } from '../../lib/schema'
import styles from './endpoint-page.module.css'

interface EndpointPageProps {
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
  serverUrl: string
  auth?: { type: string; header: string; placeholder?: string }
}

export function EndpointPage({ method, path, operation, serverUrl, auth }: EndpointPageProps) {
  const tag = operation.tags?.[0]
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]

  const headerFields = paramsToFields(params.filter((p) => p.in === 'header'))
  const headerLocations = Object.fromEntries(headerFields.map((f) => [f.name, 'header']))

  const pathFields = paramsToFields(params.filter((p) => p.in === 'path'))
  const pathLocations = Object.fromEntries(pathFields.map((f) => [f.name, 'path']))

  const queryFields = paramsToFields(params.filter((p) => p.in === 'query'))
  const queryLocations = Object.fromEntries(queryFields.map((f) => [f.name, 'query']))

  const body = getRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined)
  const responses = getResponseSections(operation.responses as Record<string, OpenAPIV3.ResponseObject>)

  const fullUrl = serverUrl + path
  const snippetHeaders: Record<string, string> = {}
  if (auth) {
    snippetHeaders[auth.header] = auth.placeholder ?? 'YOUR_API_KEY'
  }
  if (body) {
    snippetHeaders['Content-Type'] = body.contentType
  }

  return (
    <div className={styles.layout}>
      <Flex direction="column" className={styles.left}>
        {tag && <Text size={2} className={styles.tag}>{tag}</Text>}
        {operation.summary && (
          <Headline size="small" as="h1" className={styles.title}>{operation.summary}</Headline>
        )}
        {operation.description && (
          <Text size={3} className={styles.description}>{operation.description}</Text>
        )}

        <Flex align="center" className={styles.methodPath}>
          <MethodBadge method={method} />
          <Text size={3} className={styles.path}>{path}</Text>
          <Button variant="solid" size="small" className={styles.tryButton}>
            Try it
          </Button>
        </Flex>

        <FieldSection
          title="Authorization"
          fields={headerFields}
          locations={headerLocations}
        />
        <FieldSection
          title="Path"
          fields={pathFields}
          locations={pathLocations}
        />
        <FieldSection
          title="Query Parameters"
          fields={queryFields}
          locations={queryLocations}
        />
        {body && (
          <FieldSection
            title="Body"
            label={body.contentType}
            fields={body.fields}
            jsonExample={body.jsonExample}
          />
        )}

        {responses.map((resp) => (
          <FieldSection
            key={resp.status}
            title={`${resp.status}${resp.description ? ` — ${resp.description}` : ''}`}
            fields={resp.fields}
            jsonExample={resp.jsonExample}
          />
        ))}
      </Flex>
      <Flex direction="column" className={styles.right}>
        <CodeSnippets
          method={method}
          url={fullUrl}
          headers={snippetHeaders}
          body={body?.jsonExample}
        />
      </Flex>
    </div>
  )
}

function paramsToFields(params: OpenAPIV3.ParameterObject[]): SchemaField[] {
  return params.map((p) => {
    const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
    return {
      name: p.name,
      type: schema.type ? String(schema.type) : 'string',
      required: p.required ?? false,
      description: p.description,
      default: schema.default,
    }
  })
}

interface RequestBody {
  contentType: string
  fields: SchemaField[]
  jsonExample: string
}

function getRequestBody(body: OpenAPIV3.RequestBodyObject | undefined): RequestBody | null {
  if (!body?.content) return null
  const contentType = Object.keys(body.content)[0]
  if (!contentType) return null
  const schema = body.content[contentType]?.schema as OpenAPIV3.SchemaObject | undefined
  if (!schema) return null
  return {
    contentType,
    fields: flattenSchema(schema),
    jsonExample: JSON.stringify(generateExampleJson(schema), null, 2),
  }
}

interface ResponseSection {
  status: string
  description?: string
  fields: SchemaField[]
  jsonExample?: string
}

function getResponseSections(responses: Record<string, OpenAPIV3.ResponseObject>): ResponseSection[] {
  return Object.entries(responses).map(([status, resp]) => {
    const content = resp.content ?? {}
    const contentType = Object.keys(content)[0]
    const schema = contentType
      ? (content[contentType]?.schema as OpenAPIV3.SchemaObject | undefined)
      : undefined

    return {
      status,
      description: resp.description,
      fields: schema ? flattenSchema(schema) : [],
      jsonExample: schema ? JSON.stringify(generateExampleJson(schema), null, 2) : undefined,
    }
  })
}
