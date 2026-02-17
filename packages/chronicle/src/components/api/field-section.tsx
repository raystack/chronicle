'use client'

import { Flex, Text, Tabs, CodeBlock } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import { FieldRow } from './field-row'
import styles from './field-section.module.css'

interface FieldSectionProps {
  title: string
  label?: string
  fields: SchemaField[]
  locations?: Record<string, string>
  jsonExample?: string
}

export function FieldSection({ title, label, fields, locations, jsonExample }: FieldSectionProps) {
  if (fields.length === 0) return null

  const fieldsContent = (
    <Flex direction="column">
      {fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          location={locations?.[field.name]}
        />
      ))}
    </Flex>
  )

  if (jsonExample) {
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
            <CodeBlock>
              <CodeBlock.Header>
                <CodeBlock.CopyButton />
              </CodeBlock.Header>
              <CodeBlock.Content>
                <CodeBlock.Code language="json">{jsonExample}</CodeBlock.Code>
              </CodeBlock.Content>
            </CodeBlock>
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
    </Flex>
  )
}
