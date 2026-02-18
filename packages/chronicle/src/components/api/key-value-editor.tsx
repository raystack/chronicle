'use client'

import { Flex, InputField, IconButton, Button } from '@raystack/apsara'
import styles from './key-value-editor.module.css'

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

export interface KeyValueEntry {
  key: string
  value: string
}

interface KeyValueEditorProps {
  entries: KeyValueEntry[]
  onChange: (entries: KeyValueEntry[]) => void
}

export function KeyValueEditor({ entries, onChange }: KeyValueEditorProps) {
  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
  }

  const addEntry = () => {
    onChange([...entries, { key: '', value: '' }])
  }

  return (
    <Flex direction="column" gap="small" className={styles.editor}>
      {entries.map((entry, i) => (
        <Flex key={i} align="center" gap="small" className={styles.row}>
          <div className={styles.input}>
            <InputField
              size="small"
              placeholder="Header name"
              value={entry.key}
              onChange={(e) => updateEntry(i, 'key', e.target.value)}
            />
          </div>
          <div className={styles.input}>
            <InputField
              size="small"
              placeholder="Value"
              value={entry.value}
              onChange={(e) => updateEntry(i, 'value', e.target.value)}
            />
          </div>
          <IconButton size="small" variant="ghost" onClick={() => removeEntry(i)}>
            <TrashIcon />
          </IconButton>
        </Flex>
      ))}
      <Button variant="ghost" size="small" onClick={addEntry}>
        <PlusIcon /> Add header
      </Button>
    </Flex>
  )
}
