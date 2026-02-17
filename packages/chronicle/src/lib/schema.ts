import type { OpenAPIV3 } from 'openapi-types'

export interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
  default?: unknown
  children?: SchemaField[]
}

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
