'use client'

import { useState, type ReactNode } from 'react'
import { Badge, Flex } from '@raystack/apsara'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';
import type { SchemaField } from '@/lib/schema'
import styles from './api-field-list.module.css'

interface ApiFieldSectionProps {
  title: string
  fields: SchemaField[]
  headerRight?: ReactNode
  description?: string
}

export function ApiFieldSection({ title, fields, headerRight, description }: ApiFieldSectionProps) {
  if (fields.length === 0 && !description) return null

  return (
    <Flex direction="column" gap={6}>
      <Flex align="center" justify="between">
        <span className={styles.sectionTitle}>{title}</span>
        {headerRight && (
          <Flex align="center" gap={3}>
            {headerRight}
          </Flex>
        )}
      </Flex>
      {description && <span className={styles.statusDescription}>{description}</span>}
      <Flex direction="column" gap={5}>
        {fields.map((field) => (
          <FieldItem key={field.name} field={field} />
        ))}
      </Flex>
    </Flex>
  )
}

function FieldItem({ field }: { field: SchemaField }) {
  const hasChildren = field.children && field.children.length > 0

  return (
    <Flex direction="column" gap={4} className={styles.fieldItem}>
      <Flex align="center" gap={3}>
        <Badge variant="neutral" size="micro">{field.name}</Badge>
        <span className={styles.fieldType}>{field.type}</span>
        {field.required && <Badge variant="danger" size="micro">required</Badge>}
      </Flex>
      {field.description && (
        <span className={styles.fieldDescription}>{field.description}</span>
      )}
      {field.example !== undefined && (
        <span className={styles.fieldExample}>Example: <code>{JSON.stringify(field.example)}</code></span>
      )}
      {hasChildren && <ExpandableChildren field={field} />}
    </Flex>
  )
}

function ExpandableChildren({ field }: { field: SchemaField }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Flex direction="column">
      <Flex
        align="center"
        justify="between"
        className={styles.expandButton}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        <span className={styles.expandLabel}>
          {expanded ? 'Hide' : 'Show'} child attributes
        </span>
        {expanded ? (
          <ChevronDownIcon width={16} height={16} />
        ) : (
          <ChevronRightIcon width={16} height={16} />
        )}
      </Flex>
      {expanded && (
        <Flex direction="column" gap={5} className={styles.childFields}>
          {field.children!.map((child) => (
            <FieldItem key={child.name} field={child} />
          ))}
        </Flex>
      )}
    </Flex>
  )
}
