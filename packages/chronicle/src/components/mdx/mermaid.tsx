import { renderMermaidSVG } from 'beautiful-mermaid'
import { useMemo } from 'react'
import styles from './mermaid.module.css'

interface MermaidProps {
  chart: string
}

export function Mermaid({ chart }: MermaidProps) {
  const { svg, error } = useMemo(() => {
    try {
      return {
        svg: renderMermaidSVG(chart, {
          bg: 'var(--rs-color-background-base-primary)',
          fg: 'var(--rs-color-foreground-base-primary)',
          line: 'var(--rs-color-border-base-focus)',
          accent: 'var(--rs-color-foreground-accent-primary)',
          muted: 'var(--rs-color-foreground-base-secondary)',
          surface: 'var(--rs-color-background-neutral-secondary)',
          border: 'var(--rs-color-border-base-tertiary)',
          transparent: true,
        }),
        error: null,
      }
    } catch (err) {
      return {
        svg: null,
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }, [chart])

  if (error) return <pre className={styles.error}>{error.message}</pre>
  return (
    <div
      className={styles.mermaid}
      dangerouslySetInnerHTML={{ __html: svg! }}
    />
  )
}
