'use client'

import { useState } from 'react'
import { CodeBlock, CopyButton } from '@raystack/apsara'
import styles from './api-response-panel.module.css'

interface ResponseData {
  status: string
  description?: string
  jsonExample?: string
}

interface ApiResponsePanelProps {
  responses: ResponseData[]
}

export function ApiResponsePanel({ responses }: ApiResponsePanelProps) {
  const [selected, setSelected] = useState(responses[0]?.status ?? '')

  if (responses.length === 0) return null

  const active = responses.find((r) => r.status === selected) ?? responses[0]
  const displayJson = active.jsonExample ?? '{}'

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Response:</span>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.tabs}>
            {responses.map((resp) => (
              <button
                key={resp.status}
                type="button"
                className={`${styles.tab} ${resp.status === active.status ? styles.tabActive : ''}`}
                onClick={() => setSelected(resp.status)}
              >
                {resp.status}
              </button>
            ))}
          </div>
          <CopyButton text={displayJson} size={3} />
        </div>
        <div className={styles.body}>
          <CodeBlock hideLineNumbers className={styles.codeBlock}>
            <CodeBlock.Content>
              <CodeBlock.Code language="json">{displayJson}</CodeBlock.Code>
            </CodeBlock.Content>
          </CodeBlock>
        </div>
      </div>
    </div>
  )
}
