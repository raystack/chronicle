'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './mermaid.module.css'

interface MermaidProps {
  chart: string
}

export function Mermaid({ chart }: MermaidProps) {
  const mermaidId = useId().replace(/:/g, '-')
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function render() {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({ startOnLoad: false, theme: 'default' })
      const { svg: rendered } = await mermaid.render(
        mermaidId,
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
