'use client'

import { Flex, Text, Accordion, InputField, Switch, Select, IconButton } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import styles from './field-row.module.css'

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.333v9.334M3.333 8h9.334" />
    </svg>
  )
}

interface FieldRowProps {
  field: SchemaField
  location?: string
  editable?: boolean
  value?: unknown
  onChange?: (name: string, value: unknown) => void
}

export function FieldRow({ field, location, editable, value, onChange }: FieldRowProps) {
  const hasChildren = field.children && field.children.length > 0
  const isArray = field.type.endsWith('[]')

  const label = (
    <Flex align="center" className={styles.badges}>
      <Text size={2} className={styles.name}>{field.name}</Text>
      <Text size={1} className={styles.type}>{field.type}</Text>
      {location && <Text size={1} className={styles.location}>{location}</Text>}
      {field.required && <Text size={1} className={styles.required}>required</Text>}
    </Flex>
  )

  if (hasChildren && !isArray) {
    const objValue = (value ?? {}) as Record<string, unknown>
    return (
      <div className={styles.row}>
        <Accordion collapsible className={styles.accordion}>
          <Accordion.Item value={field.name}>
            <Accordion.Trigger className={styles.trigger}>{label}</Accordion.Trigger>
            <Accordion.Content>
              <div className={styles.children}>
                {field.children!.map((child) => (
                  <FieldRow
                    key={child.name}
                    field={child}
                    editable={editable}
                    value={objValue[child.name]}
                    onChange={editable ? (name, val) => {
                      onChange?.(field.name, { ...objValue, [name]: val })
                    } : undefined}
                  />
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  }

  if (isArray && editable) {
    const items = (Array.isArray(value) ? value : []) as unknown[]
    const itemChildren = field.children

    return (
      <div className={styles.row}>
        <Flex direction="column" className={styles.main}>
          <Flex align="center" justify="between">
            {label}
            <IconButton size="small" variant="ghost" onClick={() => {
              const newItem = itemChildren ? {} : ''
              onChange?.(field.name, [...items, newItem])
            }}>
              <PlusIcon />
            </IconButton>
          </Flex>
          {field.description && <Text size={2} className={styles.description}>{field.description}</Text>}
          <Flex direction="column" className={styles.arrayItems}>
            {items.map((item, i) => (
              <Flex key={i} align="start" gap="small" className={styles.arrayItem}>
                {itemChildren ? (
                  <Flex direction="column" className={styles.children}>
                    {itemChildren.map((child) => (
                      <FieldRow
                        key={child.name}
                        field={child}
                        editable
                        value={(item as Record<string, unknown>)?.[child.name]}
                        onChange={(name, val) => {
                          const updated = [...items]
                          updated[i] = { ...(updated[i] as Record<string, unknown>), [name]: val }
                          onChange?.(field.name, updated)
                        }}
                      />
                    ))}
                  </Flex>
                ) : (
                  <InputField
                    size="small"
                    value={String(item ?? '')}
                    onChange={(e) => {
                      const updated = [...items]
                      updated[i] = e.target.value
                      onChange?.(field.name, updated)
                    }}
                  />
                )}
                <IconButton size="small" variant="ghost" onClick={() => {
                  const updated = items.filter((_, j) => j !== i)
                  onChange?.(field.name, updated)
                }}>
                  <TrashIcon />
                </IconButton>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </div>
    )
  }

  // Leaf field — inline layout
  return (
    <div className={styles.row}>
      <Flex align="center" gap="medium">
        <Flex direction="column" gap="extra-small" className={styles.fieldInfo}>
          {label}
          {field.description && <Text size={2} className={styles.description}>{field.description}</Text>}
        </Flex>
        {editable ? (
          <div className={styles.fieldInput}>
            <EditableInput field={field} value={value} onChange={onChange} />
          </div>
        ) : (
          field.default !== undefined && (
            <Text size={1} className={styles.example}>
              Default: <code>{JSON.stringify(field.default)}</code>
            </Text>
          )
        )}
      </Flex>
    </div>
  )
}

function EditableInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: unknown
  onChange?: (name: string, value: unknown) => void
}) {
  if (field.enum) {
    return (
      <Select value={String(value ?? '')} onValueChange={(v) => onChange?.(field.name, v)}>
        <Select.Trigger size="small">
          <Select.Value placeholder={`Select ${field.name}`} />
        </Select.Trigger>
        <Select.Content>
          {field.enum.map((opt) => (
            <Select.Item key={String(opt)} value={String(opt)}>
              {String(opt)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    )
  }

  const baseType = field.type.replace('[]', '').replace(/\(.*\)/, '')

  if (baseType === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange?.(field.name, checked)}
      />
    )
  }

  if (baseType === 'integer' || baseType === 'number') {
    return (
      <InputField
        size="small"
        type="number"
        placeholder={field.description ?? field.name}
        value={String(value ?? '')}
        onChange={(e) => onChange?.(field.name, Number(e.target.value))}
      />
    )
  }

  return (
    <InputField
      size="small"
      placeholder={field.description ?? field.name}
      value={String(value ?? '')}
      onChange={(e) => onChange?.(field.name, e.target.value)}
    />
  )
}
