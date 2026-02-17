'use client'

import { useState } from 'react'
import { Flex, Text, Button } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import styles from './field-row.module.css'

interface FieldRowProps {
  field: SchemaField
  location?: string
}

export function FieldRow({ field, location }: FieldRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = field.children && field.children.length > 0

  return (
    <div className={styles.row}>
      <Flex direction="column" className={styles.main}>
        <Flex align="center" className={styles.badges}>
          <Text size={2} className={styles.name}>{field.name}</Text>
          <Text size={1} className={styles.type}>{field.type}</Text>
          {location && <Text size={1} className={styles.location}>{location}</Text>}
          {field.required && <Text size={1} className={styles.required}>required</Text>}
        </Flex>
        {field.description && (
          <Text size={2} className={styles.description}>{field.description}</Text>
        )}
        {field.default !== undefined && (
          <Text size={1} className={styles.example}>
            Default: <code>{JSON.stringify(field.default)}</code>
          </Text>
        )}
      </Flex>
      {hasChildren && (
        <>
          <Button
            variant="text"
            size="small"
            className={styles.toggle}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▾ Hide' : '▸ Show'} child attributes
          </Button>
          {expanded && (
            <div className={styles.children}>
              {field.children!.map((child) => (
                <FieldRow key={child.name} field={child} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
