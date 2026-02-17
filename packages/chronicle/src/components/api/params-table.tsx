'use client'

import { Table, Text } from '@raystack/apsara'
import type { SchemaField } from '../../lib/schema'
import styles from './params-table.module.css'

interface ParamsTableProps {
  title: string
  fields: SchemaField[]
}

export function ParamsTable({ title, fields }: ParamsTableProps) {
  if (fields.length === 0) return null

  const rows = flattenRows(fields)

  return (
    <div className={styles.section}>
      <Text size={4} weight="medium" className={styles.title}>{title}</Text>
      <Table className={styles.table}>
        <Table.Header>
          <Table.Row>
            <Table.Head>Field</Table.Head>
            <Table.Head>Type</Table.Head>
            <Table.Head>Required</Table.Head>
            <Table.Head>Description</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={`${row.name}-${row.depth}`}>
              <Table.Cell>
                <Text size={2} className={styles.fieldName} style={{ paddingLeft: `${row.depth * 16}px` }}>
                  {row.name}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size={2} className={styles.type}>{row.type}</Text>
              </Table.Cell>
              <Table.Cell>
                {row.required && <Text size={2} className={styles.required}>required</Text>}
              </Table.Cell>
              <Table.Cell>
                <Text size={2}>{row.description ?? ''}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

interface FlatRow {
  name: string
  type: string
  required: boolean
  description?: string
  depth: number
}

function flattenRows(fields: SchemaField[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = []
  for (const field of fields) {
    rows.push({
      name: field.name,
      type: field.type,
      required: field.required,
      description: field.description,
      depth,
    })
    if (field.children) {
      rows.push(...flattenRows(field.children, depth + 1))
    }
  }
  return rows
}
