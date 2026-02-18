import type { OpenAPIV3 } from 'openapi-types'

export interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
  default?: unknown
  enum?: unknown[]
  children?: SchemaField[]
}

export function flattenSchema(
  schema: OpenAPIV3.SchemaObject,
  requiredFields: string[] = [],
): SchemaField[] {
  if (schema.type === 'array' && schema.items) {
    const items = schema.items as OpenAPIV3.SchemaObject
    const itemType = inferType(items)
    const children =
      itemType === 'object' || items.properties
        ? flattenSchema(items, items.required ?? [])
        : itemType.endsWith('[]') && (items as OpenAPIV3.ArraySchemaObject).items
          ? flattenSchema((items as OpenAPIV3.ArraySchemaObject).items as OpenAPIV3.SchemaObject)
          : undefined
    return [{
      name: 'items',
      type: `${itemType}[]`,
      required: true,
      description: items.description,
      children: children?.length ? children : undefined,
    }]
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
        enum: prop.enum,
        children: children?.length ? children : undefined,
      }
    })
  }

  return []
}

export function generateExampleJson(schema: OpenAPIV3.SchemaObject): unknown {
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default

  if (schema.type === 'array') {
    const items = schema.items as OpenAPIV3.SchemaObject | undefined
    return items ? [generateExampleJson(items)] : []
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, OpenAPIV3.SchemaObject>
    const result: Record<string, unknown> = {}
    for (const [name, prop] of Object.entries(properties)) {
      result[name] = generateExampleJson(prop)
    }
    return result
  }

  const defaults: Record<string, unknown> = {
    string: 'string',
    integer: 0,
    number: 0,
    boolean: true,
  }
  return defaults[schema.type as string] ?? null
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
