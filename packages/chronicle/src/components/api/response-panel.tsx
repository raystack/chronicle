'use client'

import { CodeBlock } from '@raystack/apsara'
import styles from './response-panel.module.css'

interface ResponsePanelProps {
  responses: {
    status: string
    description?: string
    jsonExample?: string
  }[]
}

export function ResponsePanel({ responses }: ResponsePanelProps) {
  const withExamples = responses.filter((r) => r.jsonExample)
  if (withExamples.length === 0) return null

  const defaultValue = withExamples[0].status

  return (
    <CodeBlock defaultValue={defaultValue} className={styles.panel}>
      <CodeBlock.Header>
        <CodeBlock.LanguageSelect>
          <CodeBlock.LanguageSelectTrigger />
          <CodeBlock.LanguageSelectContent>
            {withExamples.map((resp) => (
              <CodeBlock.LanguageSelectItem key={resp.status} value={resp.status}>
                {resp.status} {resp.description ?? resp.status}
              </CodeBlock.LanguageSelectItem>
            ))}
          </CodeBlock.LanguageSelectContent>
        </CodeBlock.LanguageSelect>
        <CodeBlock.CopyButton />
      </CodeBlock.Header>
      <CodeBlock.Content>
        {withExamples.map((resp) => (
          <CodeBlock.Code key={resp.status} value={resp.status} language="json">
            {resp.jsonExample!}
          </CodeBlock.Code>
        ))}
      </CodeBlock.Content>
    </CodeBlock>
  )
}
