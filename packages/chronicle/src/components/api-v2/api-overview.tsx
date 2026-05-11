'use client'

import type { OpenAPIV3 } from 'openapi-types'
import { Flex, IconButton, Badge, Button } from '@raystack/apsara'
import { CopyIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { MethodBadge } from '@/components/api/method-badge'
import { CodeSnippets } from '@/components/api/code-snippets'
import { ResponsePanel } from '@/components/api/response-panel'
import { flattenSchema, generateExampleJson, type SchemaField } from '@/lib/schema'
import { ApiFieldSection } from './api-field-list'
import styles from './api-overview.module.css'

interface ApiOverviewProps {
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
  serverUrl: string
  specName: string
  auth?: { type: string; header: string; placeholder?: string }
}

export function ApiOverview({ method, path, operation, auth }: ApiOverviewProps) {
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]
  const body = getRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined)

  const headerFields = paramsToFields(params.filter((p) => p.in === 'header'))
  const pathFields = paramsToFields(params.filter((p) => p.in === 'path'))
  const queryFields = paramsToFields(params.filter((p) => p.in === 'query'))
  const responses = getResponseSections(operation.responses as Record<string, OpenAPIV3.ResponseObject>)

  const authFields: SchemaField[] = auth
    ? [{ name: auth.header, type: 'String', required: false }]
    : headerFields.length > 0
      ? headerFields
      : []

  const fullUrl = '{domain}' + path
  const snippetHeaders: Record<string, string> = {}
  if (auth) snippetHeaders[auth.header] = auth.placeholder ?? 'YOUR_API_KEY'
  if (body) snippetHeaders['Content-Type'] = body.contentType ?? 'application/json'

  const copyPath = () => {
    void navigator.clipboard.writeText(path)
  }

  return (
    <div className={styles.layout}>
      <Flex direction="column" gap="large" className={styles.left}>
        <Flex direction="column" gap="small">
          {operation.summary && (
            <h1 className={styles.title}>{operation.summary}</h1>
          )}
          {operation.description && (
            <p className={styles.description}>{operation.description}</p>
          )}
        </Flex>

        <Flex align="center" gap="small" style={{ padding: 'var(--rs-space-3) 0' }}>
          <MethodBadge method={method} />
          <span className={styles.path}>{path}</span>
          <IconButton size={2} onClick={copyPath}>
            <CopyIcon />
          </IconButton>
        </Flex>

        {authFields.length > 0 && (
          <ApiFieldSection title="Authorisations" fields={authFields} />
        )}

        {pathFields.length > 0 && (
          <ApiFieldSection title="Path Parameters" fields={pathFields} />
        )}

        {queryFields.length > 0 && (
          <ApiFieldSection title="Query Parameters" fields={queryFields} />
        )}

        {body && body.fields.length > 0 && (
          <ApiFieldSection title="Request Body" fields={body.fields} />
        )}

        {responses.map((resp) => (
          <ApiFieldSection
            key={resp.status}
            title="Response"
            fields={resp.fields}
            description={resp.description}
            headerRight={
              <>
                {resp.contentType && (
                  <span className={styles.path}>{resp.contentType}</span>
                )}
                <Button variant="text" color="neutral" size="small" trailingIcon={<ChevronDownIcon />}>
                  {resp.status}
                </Button>
              </>
            }
          />
        ))}
      </Flex>

      <Flex direction="column" gap="medium" className={styles.right}>
        <CodeSnippets
          method={method}
          url={fullUrl}
          headers={snippetHeaders}
          body={body ? body.jsonExample : undefined}
        />
        <Flex direction="column" gap="small">
          <span className={styles.responseLabel}>Response:</span>
          <ResponsePanel responses={responses} />
        </Flex>
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
  contentType?: string
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
      contentType,
      fields: schema ? flattenSchema(schema) : [],
      jsonExample: schema ? JSON.stringify(generateExampleJson(schema), null, 2) : undefined,
    }
  })
}
