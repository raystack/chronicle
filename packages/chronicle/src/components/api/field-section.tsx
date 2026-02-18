'use client'

import { Flex, Text, Tabs, CodeBlock } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import { FieldRow } from './field-row'
import { JsonEditor } from './json-editor'
import styles from './field-section.module.css'

interface FieldSectionProps {
  title: string
  label?: string
  fields: SchemaField[]
  locations?: Record<string, string>
  jsonExample?: string
  editableJson?: boolean
  onJsonChange?: (value: string) => void
  alwaysShow?: boolean
  editable?: boolean
  values?: Record<string, unknown>
  onValuesChange?: (values: Record<string, unknown>) => void
  children?: React.ReactNode
}

export function FieldSection({
  title, label, fields, locations, jsonExample,
  editableJson, onJsonChange, alwaysShow,
  editable, values, onValuesChange, children,
}: FieldSectionProps) {
  if (fields.length === 0 && !children && !alwaysShow) return null

  const fieldsContent = fields.length > 0 ? (
    <Flex direction="column">
      {fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          location={locations?.[field.name]}
          editable={editable}
          value={values?.[field.name]}
          onChange={editable ? (name, val) => {
            onValuesChange?.({ ...values, [name]: val })
          } : undefined}
        />
      ))}
    </Flex>
  ) : !children ? (
    <Text size={2} className={styles.noFields}>No fields defined</Text>
  ) : null

  if (jsonExample !== undefined || alwaysShow) {
    return (
      <Flex direction="column">
        <Flex align="center" justify="between" className={styles.header}>
          <Text size={4} weight="medium">{title}</Text>
          {label && <Text size={2} className={styles.label}>{label}</Text>}
        </Flex>
        <div className={styles.separator} />
        <Tabs defaultValue="fields" className={styles.tabs}>
          <Tabs.List>
            <Tabs.Trigger value="fields">Fields</Tabs.Trigger>
            <Tabs.Trigger value="json">JSON</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="fields">
            {fieldsContent}
          </Tabs.Content>
          <Tabs.Content value="json">
            {editableJson ? (
              <JsonEditor
                value={jsonExample ?? '{}'}
                onChange={onJsonChange}
              />
            ) : (
              <CodeBlock>
                <CodeBlock.Header>
                  <CodeBlock.CopyButton />
                </CodeBlock.Header>
                <CodeBlock.Content>
                  <CodeBlock.Code language="json">{jsonExample ?? '{}'}</CodeBlock.Code>
                </CodeBlock.Content>
              </CodeBlock>
            )}
          </Tabs.Content>
        </Tabs>
      </Flex>
    )
  }

  return (
    <Flex direction="column">
      <Flex align="center" justify="between" className={styles.header}>
        <Text size={4} weight="medium">{title}</Text>
        {label && <Text size={2} className={styles.label}>{label}</Text>}
      </Flex>
      <div className={styles.separator} />
      {fieldsContent}
      {children}
    </Flex>
  )
}
