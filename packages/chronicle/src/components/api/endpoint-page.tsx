'use client'

import { useState, useCallback } from 'react'
import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Text, Headline, Button, CodeBlock } from '@raystack/apsara'
import { MethodBadge } from './method-badge'
import { FieldSection } from './field-section'
import { CodeSnippets } from './code-snippets'
import { ResponsePanel } from './response-panel'
import { flattenSchema, generateExampleJson, type SchemaField } from '../../lib/schema'
import styles from './endpoint-page.module.css'

interface EndpointPageProps {
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
  serverUrl: string
  specName: string
  auth?: { type: string; header: string; placeholder?: string }
}

export function EndpointPage({ method, path, operation, serverUrl, specName, auth }: EndpointPageProps) {
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]
  const body = getRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined)

  const headerFields = paramsToFields(params.filter((p) => p.in === 'header'))
  const headerLocations = Object.fromEntries(headerFields.map((f) => [f.name, 'header']))
  const pathFields = paramsToFields(params.filter((p) => p.in === 'path'))
  const pathLocations = Object.fromEntries(pathFields.map((f) => [f.name, 'path']))
  const queryFields = paramsToFields(params.filter((p) => p.in === 'query'))
  const queryLocations = Object.fromEntries(queryFields.map((f) => [f.name, 'query']))
  const responses = getResponseSections(operation.responses as Record<string, OpenAPIV3.ResponseObject>)

  // State for editable fields
  const [headerValues, setHeaderValues] = useState<Record<string, unknown>>({})
  const [pathValues, setPathValues] = useState<Record<string, unknown>>({})
  const [queryValues, setQueryValues] = useState<Record<string, unknown>>({})
  const [bodyValues, setBodyValues] = useState<Record<string, unknown>>(() => {
    try { return body?.jsonExample ? JSON.parse(body.jsonExample) : {} }
    catch { return {} }
  })
  const [bodyJsonStr, setBodyJsonStr] = useState(body?.jsonExample ?? '{}')
  const [responseBody, setResponseBody] = useState<{ status: number; statusText: string; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  // Two-way sync: fields → JSON
  const handleBodyValuesChange = useCallback((values: Record<string, unknown>) => {
    setBodyValues(values)
    setBodyJsonStr(JSON.stringify(values, null, 2))
  }, [])

  // Two-way sync: JSON → fields
  const handleBodyJsonChange = useCallback((jsonStr: string) => {
    setBodyJsonStr(jsonStr)
    try {
      setBodyValues(JSON.parse(jsonStr))
    } catch { /* ignore invalid JSON while typing */ }
  }, [])

  // Try it handler
  const handleTryIt = useCallback(async () => {
    setLoading(true)
    setResponseBody(null)

    let resolvedPath = path
    for (const [key, value] of Object.entries(pathValues)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(String(value)))
    }

    const queryEntries = Object.entries(queryValues).filter(([, v]) => v !== undefined && v !== '')
    const queryString = queryEntries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    const fullPath = queryString ? `${resolvedPath}?${queryString}` : resolvedPath

    const reqHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(headerValues)) {
      if (value) reqHeaders[key] = String(value)
    }
    if (auth && headerValues[auth.header]) {
      reqHeaders[auth.header] = String(headerValues[auth.header])
    }
    if ((method === 'POST' || method === 'PUT') && bodyJsonStr) {
      reqHeaders['Content-Type'] = body?.contentType ?? 'application/json'
    }

    try {
      const res = await fetch('/api/apis-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specName,
          method,
          path: fullPath,
          headers: reqHeaders,
          body: (method === 'POST' || method === 'PUT') ? bodyValues : undefined,
        }),
      })
      const data = await res.json()
      if (data.status !== undefined) {
        setResponseBody(data)
      } else {
        setResponseBody({ status: res.status, statusText: res.statusText, body: data.error ?? data })
      }
    } catch {
      setResponseBody({ status: 0, statusText: 'Error', body: 'Failed to send request' })
    } finally {
      setLoading(false)
    }
  }, [specName, method, path, pathValues, queryValues, headerValues, bodyValues, bodyJsonStr, auth, body])

  // Snippet display values
  const fullUrl = '{domain}' + path
  const snippetHeaders: Record<string, string> = {}
  if (auth) {
    snippetHeaders[auth.header] = auth.placeholder ?? 'YOUR_API_KEY'
  }
  if (method === 'POST' || method === 'PUT') {
    snippetHeaders['Content-Type'] = body?.contentType ?? 'application/json'
  }

  return (
    <div className={styles.layout}>
      <Flex direction="column" className={styles.left}>
        {operation.summary && (
          <Headline size="small" as="h1" className={styles.title}>{operation.summary}</Headline>
        )}
        {operation.description && (
          <Text size={3} className={styles.description}>{operation.description}</Text>
        )}

        <Flex align="center" className={styles.methodPath}>
          <MethodBadge method={method} />
          <Text size={3} className={styles.path}>{path}</Text>
          <Button variant="solid" size="small" className={styles.tryButton} onClick={handleTryIt} disabled={loading}>
            {loading ? 'Sending...' : 'Try it'}
          </Button>
        </Flex>

        <FieldSection
          title="Authorization"
          fields={headerFields}
          locations={headerLocations}
          editable
          values={headerValues}
          onValuesChange={setHeaderValues}
        />
        <FieldSection
          title="Path"
          fields={pathFields}
          locations={pathLocations}
          editable
          values={pathValues}
          onValuesChange={setPathValues}
        />
        <FieldSection
          title="Query Parameters"
          fields={queryFields}
          locations={queryLocations}
          editable
          values={queryValues}
          onValuesChange={setQueryValues}
        />
        {(body || method === 'POST' || method === 'PUT') && (
          <FieldSection
            title="Body"
            label={body?.contentType}
            fields={body?.fields ?? []}
            jsonExample={bodyJsonStr}
            editableJson
            onJsonChange={handleBodyJsonChange}
            alwaysShow
            editable
            values={bodyValues}
            onValuesChange={handleBodyValuesChange}
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
          body={(method === 'POST' || method === 'PUT') ? bodyJsonStr : undefined}
        />
        <ResponsePanel responses={responses} />
        {responseBody && (
          <Flex direction="column" gap="small">
            <Text size={3} weight="medium">
              Response — {responseBody.status} {responseBody.statusText}
            </Text>
            <CodeBlock value="json">
              <CodeBlock.Header>
                <CodeBlock.CopyButton />
              </CodeBlock.Header>
              <CodeBlock.Content>
                <CodeBlock.Code value="json" language="json">
                  {typeof responseBody.body === 'string'
                    ? (responseBody.body || 'No response body')
                    : (JSON.stringify(responseBody.body, null, 2) ?? 'No response body')}
                </CodeBlock.Code>
              </CodeBlock.Content>
            </CodeBlock>
          </Flex>
        )}
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
