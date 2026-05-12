'use client'

import { useMemo, useState } from 'react'
import { CodeBlock } from '@raystack/apsara'
import {
  generateCurl,
  generatePython,
  generateGo,
  generateTypeScript,
} from '@/lib/snippet-generators'
import styles from './api-code-snippet.module.css'

interface ApiCodeSnippetProps {
  title: string
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

const languages = [
  { value: 'curl', label: 'cURL', lang: 'bash', generate: generateCurl },
  { value: 'python', label: 'Python', lang: 'python', generate: generatePython },
  { value: 'go', label: 'Go', lang: 'go', generate: generateGo },
  { value: 'typescript', label: 'TypeScript', lang: 'typescript', generate: generateTypeScript },
]

export function ApiCodeSnippet({ title, method, url, headers, body }: ApiCodeSnippetProps) {
  const [selected, setSelected] = useState('curl')
  const current = languages.find((l) => l.value === selected) ?? languages[0]

  const code = useMemo(
    () => current.generate({ method, url, headers, body }),
    [selected, method, url, headers, body],
  )

  return (
    <CodeBlock
      value={selected}
      onValueChange={setSelected}
      className={styles.container}
    >
      <CodeBlock.Header className={styles.header}>
        <CodeBlock.Label className={styles.title}>{title}</CodeBlock.Label>
        <div className={styles.actions}>
          <CodeBlock.LanguageSelect>
            <CodeBlock.LanguageSelectTrigger />
            <CodeBlock.LanguageSelectContent>
              {languages.map((l) => (
                <CodeBlock.LanguageSelectItem key={l.value} value={l.value}>
                  {l.label}
                </CodeBlock.LanguageSelectItem>
              ))}
            </CodeBlock.LanguageSelectContent>
          </CodeBlock.LanguageSelect>
          <CodeBlock.CopyButton />
        </div>
      </CodeBlock.Header>
      <CodeBlock.Content className={styles.body}>
        <CodeBlock.Code value={selected} language={current.lang}>{code}</CodeBlock.Code>
      </CodeBlock.Content>
    </CodeBlock>
  )
}
