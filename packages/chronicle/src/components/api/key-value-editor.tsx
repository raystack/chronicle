'use client'

import { Flex, InputField, IconButton, Button } from '@raystack/apsara'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import styles from './key-value-editor.module.css'

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
            <TrashIcon width={14} height={14} />
          </IconButton>
        </Flex>
      ))}
      <Button variant="ghost" size="small" onClick={addEntry}>
        <PlusIcon width={14} height={14} /> Add header
      </Button>
    </Flex>
  )
}
