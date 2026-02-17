'use client'

import type { OpenAPIV3 } from 'openapi-types'
import { Flex, Text, Headline } from '@raystack/apsara'
import { MethodBadge } from './method-badge'
import { ParamsTable } from './params-table'
import { flattenSchema, type SchemaField } from '../../lib/schema'
import styles from './endpoint-page.module.css'

interface EndpointPageProps {
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
}

export function EndpointPage({ method, path, operation }: EndpointPageProps) {
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]
  const headerParams = paramsToFields(params.filter((p) => p.in === 'header'))
  const pathParams = paramsToFields(params.filter((p) => p.in === 'path'))
  const queryParams = paramsToFields(params.filter((p) => p.in === 'query'))
  const bodyFields = getRequestBodyFields(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined)
  const responses = getResponseSections(operation.responses as Record<string, OpenAPIV3.ResponseObject>)

  return (
    <Flex direction="column" gap="large" className={styles.page}>
      <div className={styles.header}>
        <Flex gap="small" align="center">
          <MethodBadge method={method} />
          <Text size={4} weight="medium" className={styles.path}>{path}</Text>
        </Flex>
        {operation.summary && (
          <Headline size="small" as="h1" className={styles.summary}>{operation.summary}</Headline>
        )}
        {operation.description && (
          <Text size={3} className={styles.description}>{operation.description}</Text>
        )}
      </div>

      <ParamsTable title="Headers" fields={headerParams} />
      <ParamsTable title="Path Parameters" fields={pathParams} />
      <ParamsTable title="Query Parameters" fields={queryParams} />
      <ParamsTable title="Request Body" fields={bodyFields} />

      {responses.map((resp) => (
        <ParamsTable
          key={resp.status}
          title={`Response ${resp.status}${resp.description ? ` — ${resp.description}` : ''}`}
          fields={resp.fields}
        />
      ))}
    </Flex>
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

function getRequestBodyFields(body: OpenAPIV3.RequestBodyObject | undefined): SchemaField[] {
  if (!body?.content) return []
  const contentType = Object.keys(body.content)[0]
  if (!contentType) return []
  const schema = body.content[contentType]?.schema as OpenAPIV3.SchemaObject | undefined
  if (!schema) return []
  return flattenSchema(schema)
}

interface ResponseSection {
  status: string
  description?: string
  fields: SchemaField[]
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
    }
  })
}
