'use client'

import { useState } from 'react'
import { Flex, Text, Button } from '@raystack/apsara'
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
  const [viewMode, setViewMode] = useState<'fields' | 'json'>('fields')

  if (fields.length === 0) return null

  return (
    <Flex direction="column">
      <Flex align="center" justify="between" className={styles.header}>
        <Flex align="center" className={styles.headerLeft}>
          <Text size={4} weight="medium">{title}</Text>
          {jsonExample && (
            <Flex className={styles.viewToggle}>
              <Button
                variant={viewMode === 'fields' ? 'outline' : 'ghost'}
                size="small"
                className={styles.toggleBtn}
                onClick={() => setViewMode('fields')}
              >
                Fields
              </Button>
              <Button
                variant={viewMode === 'json' ? 'outline' : 'ghost'}
                size="small"
                className={styles.toggleBtn}
                onClick={() => setViewMode('json')}
              >
                JSON
              </Button>
            </Flex>
          )}
        </Flex>
        {label && <Text size={2} className={styles.label}>{label}</Text>}
      </Flex>
      <div className={styles.separator} />
      {viewMode === 'fields' ? (
        <Flex direction="column">
          {fields.map((field) => (
            <FieldRow
              key={field.name}
              field={field}
              location={locations?.[field.name]}
            />
          ))}
        </Flex>
      ) : (
        <pre className={styles.json}><code>{jsonExample}</code></pre>
      )}
    </Flex>
  )
}
