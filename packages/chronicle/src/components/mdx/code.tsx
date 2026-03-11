'use client'

import type { ComponentProps } from 'react'
import styles from './code.module.css'

type PreProps = ComponentProps<'pre'> & {
  'data-language'?: string
  title?: string
}

export function MdxCode({ children, className, ...props }: ComponentProps<'code'>) {
  if (className || (typeof children === 'object')) {
    return <code className={className} {...props}>{children}</code>
  }
  return <code className={styles.inlineCode} {...props}>{children}</code>
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
