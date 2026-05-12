'use client'

import { useState } from 'react'
import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Button, Menu, CopyButton, Separator } from '@raystack/apsara'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { MethodBadge } from '@/components/api/method-badge'
import { ApiCodeSnippet } from './api-code-snippet'
import { ApiResponsePanel } from './api-response-panel'
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
    ? [{ name: auth.header, type: 'String', kind: 'string' as const, required: false }]
    : headerFields.length > 0
      ? headerFields
      : []

  const fullUrl = '{domain}' + path
  const snippetHeaders: Record<string, string> = {}
  if (auth) snippetHeaders[auth.header] = auth.placeholder ?? 'YOUR_API_KEY'
  if (body) snippetHeaders['Content-Type'] = body.contentType ?? 'application/json'


  const hasSections = authFields.length > 0 || pathFields.length > 0 ||
    queryFields.length > 0 || (body && body.fields.length > 0) || responses.length > 0

  return (
    <Flex className={styles.layout}>
      <Flex direction='column' gap={10} className={styles.left}>
        <Flex direction='column' gap={7}>
          <Flex direction='column' gap={4}>
            {operation.summary && (
              <h1 className={styles.title}>{operation.summary}</h1>
            )}
            {operation.description && (
              <p className={styles.description}>{operation.description}</p>
            )}
          </Flex>
          <Flex align='center' gap={3} className={styles.methodBar}>
            <MethodBadge method={method} />
            <span className={styles.path}>{path}</span>
            <CopyButton text={path} size={2} />
          </Flex>
        </Flex>

        {hasSections && (
          <Flex direction='column' gap={6}>
            {authFields.length > 0 && (
              <ApiFieldSection title="Authorisations" fields={authFields} />
            )}

            {authFields.length > 0 && (queryFields.length > 0 || pathFields.length > 0 || (body && body.fields.length > 0) || responses.length > 0) && (
              <Separator className={styles.divider} />
            )}

            {pathFields.length > 0 && (
              <ApiFieldSection title="Path Parameters" fields={pathFields} />
            )}

            {pathFields.length > 0 && (queryFields.length > 0 || (body && body.fields.length > 0) || responses.length > 0) && (
              <Separator className={styles.divider} />
            )}

            {queryFields.length > 0 && (
              <ApiFieldSection title="Query Parameters" fields={queryFields} />
            )}

            {queryFields.length > 0 && ((body && body.fields.length > 0) || responses.length > 0) && (
              <Separator className={styles.divider} />
            )}

            {body && body.fields.length > 0 && (
              <ApiFieldSection title="Request Body" fields={body.fields} />
            )}

            {body && body.fields.length > 0 && responses.length > 0 && (
              <Separator className={styles.divider} />
            )}

            {responses.length > 0 && (
              <ResponseSection responses={responses} />
            )}
          </Flex>
        )}
      </Flex>

      <Flex direction='column' gap={8} className={styles.right}>
        <ApiCodeSnippet
          title={operation.summary ?? `${method.toUpperCase()} ${path}`}
          method={method}
          url={fullUrl}
          headers={snippetHeaders}
          body={body ? body.jsonExample : undefined}
        />
        <ApiResponsePanel responses={responses} />
      </Flex>
    </Flex>
  )
}

function ResponseSection({ responses }: { responses: ResponseSectionData[] }) {
  const [selectedStatus, setSelectedStatus] = useState(responses[0]?.status ?? '200')
  const active = responses.find((r) => r.status === selectedStatus) ?? responses[0]
  if (!active) return null

  return (
    <ApiFieldSection
      title="Response"
      fields={active.fields}
      description={active.description}
      headerRight={
        <>
          {active.contentType && (
            <span className={styles.path}>{active.contentType}</span>
          )}
          <Menu>
            <Menu.Trigger
              render={
                <Button variant="text" color="neutral" size="small" trailingIcon={<ChevronDownIcon />} />
              }
            >
              {active.status}
            </Menu.Trigger>
            <Menu.Content>
              {responses.map((resp) => (
                <Menu.Item key={resp.status} onClick={() => setSelectedStatus(resp.status)}>
                  {resp.status}{resp.description ? ` — ${resp.description}` : ''}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu>
        </>
      }
    />
  )
}

function paramsToFields(params: OpenAPIV3.ParameterObject[]): SchemaField[] {
  return params.map((p) => {
    const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
    return {
      name: p.name,
      type: schema.type ? String(schema.type) : 'string',
      kind: (schema.type as SchemaField['kind']) ?? 'string',
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

interface ResponseSectionData {
  status: string
  description?: string
  contentType?: string
  fields: SchemaField[]
  jsonExample?: string
}

function getResponseSections(responses: Record<string, OpenAPIV3.ResponseObject>): ResponseSectionData[] {
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
