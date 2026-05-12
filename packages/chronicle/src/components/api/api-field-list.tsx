'use client'

import { useState, type ReactNode } from 'react'
import { Badge, Flex, IconButton } from '@raystack/apsara'
import { ChevronRightIcon, ChevronDownIcon } from '@radix-ui/react-icons'
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
    <div className={styles.fieldItem}>
      <Flex align="center" gap={3}>
        <Badge variant="neutral" size="micro">{field.name}</Badge>
        <span className={styles.fieldType}>{field.type}</span>
      </Flex>
      {field.description && (
        <Flex>
          <span className={styles.fieldDescription}>{field.description}</span>
        </Flex>
      )}
      {hasChildren && <ExpandableChildren field={field} />}
    </div>
  )
}

function ExpandableChildren({ field }: { field: SchemaField }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Flex direction="column">
      <button
        type="button"
        className={styles.expandButton}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.expandLabel}>
          {expanded ? 'Hide' : 'Show'} child attributes
        </span>
        {expanded ? (
          <ChevronDownIcon width={16} height={16} />
        ) : (
          <ChevronRightIcon width={16} height={16} />
        )}
      </button>
      {expanded && (
        <div className={styles.childFields}>
          {field.children!.map((child) => (
            <FieldItem key={child.name} field={child} />
          ))}
        </div>
      )}
    </Flex>
  )
}
