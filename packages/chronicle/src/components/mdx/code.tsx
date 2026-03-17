'use client'

import { type ComponentProps, isValidElement, Children } from 'react'
import { Mermaid } from './mermaid'
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
  // Detect mermaid code blocks
  if (isValidElement(children)) {
    const childProps = children.props as { className?: string; children?: string }
    if (childProps.className?.includes('language-mermaid') && typeof childProps.children === 'string') {
      return <Mermaid chart={childProps.children} />
    }
  }

  return (
    <div className={styles.codeBlock}>
      {title && <div className={styles.codeHeader}>{title}</div>}
      <pre className={`${styles.pre} ${className ?? ''}`} {...props}>
        {children}
      </pre>
    </div>
  )
}
