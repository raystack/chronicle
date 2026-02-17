'use client'

import { Flex, Text, Accordion } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import styles from './field-row.module.css'

interface FieldRowProps {
  field: SchemaField
  location?: string
}

export function FieldRow({ field, location }: FieldRowProps) {
  const hasChildren = field.children && field.children.length > 0

  if (hasChildren) {
    return (
      <div className={styles.row}>
        <Accordion collapsible className={styles.accordion}>
          <Accordion.Item value={field.name}>
            <Accordion.Trigger className={styles.trigger}>
              <Flex align="center" className={styles.badges}>
                <Text size={2} className={styles.name}>{field.name}</Text>
                <Text size={1} className={styles.type}>{field.type}</Text>
                {location && <Text size={1} className={styles.location}>{location}</Text>}
                {field.required && <Text size={1} className={styles.required}>required</Text>}
              </Flex>
            </Accordion.Trigger>
            <Accordion.Content>
              <div className={styles.children}>
                {field.children!.map((child) => (
                  <FieldRow key={child.name} field={child} />
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  }

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
    </div>
  )
}
