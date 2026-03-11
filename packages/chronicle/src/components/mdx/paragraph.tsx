import type { ComponentProps } from 'react'
import styles from './paragraph.module.css'

export function MdxParagraph({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={`${styles.paragraph} ${className ?? ''}`} {...props}>
      {children}
    </p>
  )
}
