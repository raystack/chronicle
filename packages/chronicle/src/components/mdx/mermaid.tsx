'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './mermaid.module.css'

interface MermaidProps {
  chart: string
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function render() {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({ startOnLoad: false, theme: 'default' })
      const { svg: rendered } = await mermaid.render(
        `mermaid-${Math.random().toString(36).slice(2)}`,
        chart
      )
      if (!cancelled) setSvg(rendered)
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  return (
    <div
      ref={ref}
      className={styles.mermaid}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
