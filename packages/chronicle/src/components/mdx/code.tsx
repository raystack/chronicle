'use client'

import type { ComponentProps } from 'react'
import styles from './code.module.css'

type PreProps = ComponentProps<'pre'> & {
  'data-language'?: string
  title?: string
}

export function MdxPre({ children, title, className, ...props }: PreProps) {
  return (
    <div className={styles.codeBlock}>
      {title && <div className={styles.codeHeader}>{title}</div>}
      <pre className={`${styles.pre} ${className ?? ''}`} {...props}>
        {children}
      </pre>
    </div>
  )
}
