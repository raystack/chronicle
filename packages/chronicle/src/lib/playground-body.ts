import { type SchemaField, type SchemaFieldKind, toKind } from './schema'

export function coerceValue(kind: SchemaFieldKind, raw: string): unknown {
  if (kind === 'boolean') return raw === 'true'
  if (kind === 'number' || kind === 'integer') {
    if (raw.trim() === '') return ''
    const n = Number(raw)
    if (!Number.isFinite(n)) return raw
    if (kind === 'integer' && !Number.isSafeInteger(n)) return raw
    return n
  }
  return raw
}

export function arrayItemKind(field: SchemaField): SchemaFieldKind {
  const itemType = field.type.replace(/\[\]$/, '').replace(/\(.*\)$/, '')
  return toKind(itemType)
}

export function initFieldValue(field: SchemaField): unknown {
  if (field.default !== undefined) return field.default
  if (field.kind === 'array') return []
  if (field.kind === 'object' || field.children) return initBodyValues(field.children ?? [])
  if (field.kind === 'boolean') return false
  return undefined
}

export function initBodyValues(fields: SchemaField[]): Record<string, unknown> {
  const init: Record<string, unknown> = {}
  for (const f of fields) {
    const value = initFieldValue(f)
    if (value !== undefined) init[f.name] = value
  }
  return init
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object' && value !== null) return Object.keys(value).length === 0
  return false
}

export function pruneBody(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneBody).filter((v) => !isEmpty(v))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      const pruned = pruneBody(v)
      if (!isEmpty(pruned)) result[key] = pruned
    }
    return result
  }
  return value
}
