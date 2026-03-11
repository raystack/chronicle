import type { ComponentProps } from 'react'
import styles from './details.module.css'

export function MdxDetails({ children, className, ...props }: ComponentProps<'details'>) {
  return (
    <details className={`${styles.details} ${className ?? ''}`} {...props}>
      {children}
    </details>
  )
}

export function MdxSummary({ children, className, ...props }: ComponentProps<'summary'>) {
  return (
    <summary className={`${styles.summary} ${className ?? ''}`} {...props}>
      {children}
    </summary>
  )
}
